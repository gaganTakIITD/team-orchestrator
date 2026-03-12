"""
preprocessor.py — Stages 2-5: Advanced Preprocessing Engine.
Enriches raw commit JSONs with structural analysis, statistical anomaly detection,
cross-commit intelligence, and feature engineering.
All pure Python — no AI calls. Output feeds the LLM for better-quality scoring.
"""

import os
import re
import json
from collections import Counter, defaultdict
from typing import Dict, List, Optional, Set
from datetime import datetime

from src.utils import get_logger, load_json, save_json
from src.security import sign_output

logger = get_logger("preprocessor")


# ─── Extension → Language Mapping ────────────────────────────────────────────

EXTENSION_MAP = {
    ".py": "Python", ".pyw": "Python",
    ".js": "JavaScript", ".jsx": "JavaScript", ".mjs": "JavaScript",
    ".ts": "TypeScript", ".tsx": "TypeScript",
    ".java": "Java",
    ".cpp": "C++", ".cc": "C++", ".cxx": "C++", ".hpp": "C++", ".h": "C/C++",
    ".c": "C",
    ".cs": "C#",
    ".go": "Go",
    ".rs": "Rust",
    ".rb": "Ruby",
    ".php": "PHP",
    ".swift": "Swift",
    ".kt": "Kotlin", ".kts": "Kotlin",
    ".r": "R", ".R": "R",
    ".m": "MATLAB/Objective-C",
    ".sql": "SQL",
    ".html": "HTML", ".htm": "HTML",
    ".css": "CSS", ".scss": "SCSS", ".less": "LESS",
    ".sh": "Shell", ".bash": "Shell", ".zsh": "Shell",
    ".ps1": "PowerShell",
    ".yaml": "YAML", ".yml": "YAML",
    ".json": "JSON",
    ".xml": "XML",
    ".md": "Markdown", ".rst": "reStructuredText",
    ".ipynb": "Jupyter",
    ".dart": "Dart",
    ".lua": "Lua",
    ".scala": "Scala",
    ".pl": "Perl",
}

FILE_CATEGORIES = {
    "source": {".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".cpp", ".cc", ".c",
               ".cs", ".go", ".rs", ".rb", ".php", ".swift", ".kt", ".dart", ".scala"},
    "test": set(),  # detected by path patterns
    "config": {".yaml", ".yml", ".json", ".toml", ".ini", ".cfg", ".env", ".conf"},
    "docs": {".md", ".rst", ".txt", ".doc", ".pdf"},
    "build": {".gradle", ".cmake", ".makefile", ".dockerfile"},
    "assets": {".png", ".jpg", ".svg", ".gif", ".ico", ".mp4", ".mp3"},
}


# ─── Sentiment Keywords ──────────────────────────────────────────────────────

NEGATIVE_MARKERS = {"fuck", "shit", "damn", "hate", "stupid", "broken", "ugh",
                    "crap", "terrible", "awful", "garbage", "trash", "wtf", "fml"}
POSITIVE_MARKERS = {"great", "finally", "awesome", "perfect", "excellent", "nice",
                    "fixed", "resolved", "improved", "clean", "elegant"}
FRUSTRATION_PATTERNS = re.compile(
    r"(!{3,}|\.{4,}|why\s+doesn.?t|doesn.?t\s+work|still\s+broken|again\??!)",
    re.IGNORECASE
)


# ─── Stage 2: Structural Analysis ────────────────────────────────────────────

def _detect_languages(files_changed: List[dict]) -> List[str]:
    """Detect programming languages from file extensions."""
    langs = set()
    for f in files_changed:
        ext = os.path.splitext(f["filename"])[1].lower()
        if ext in EXTENSION_MAP:
            langs.add(EXTENSION_MAP[ext])
    return sorted(langs)


def _categorize_files(files_changed: List[dict]) -> Dict[str, int]:
    """Categorize files into source/test/config/docs/build/assets."""
    categories = Counter()
    for f in files_changed:
        fname = f["filename"].lower()
        ext = os.path.splitext(fname)[1].lower()

        # Test detection by path
        if any(p in fname for p in ["test", "spec", "__test", "_test", "tests/"]):
            categories["test"] += 1
            continue

        matched = False
        for cat, extensions in FILE_CATEGORIES.items():
            if cat == "test":
                continue
            if ext in extensions:
                categories[cat] += 1
                matched = True
                break
        if not matched:
            categories["other"] += 1

    return dict(categories)


def _analyze_code_complexity(patch: str) -> dict:
    """
    Estimate cyclomatic and cognitive complexity from the patch diff.
    Only counts ADDED lines (lines starting with +).
    """
    added_lines = [
        line[1:] for line in patch.split("\n")
        if line.startswith("+") and not line.startswith("+++")
    ]
    code = "\n".join(added_lines)

    # Cyclomatic complexity: count decision points
    control_patterns = [
        r"\bif\b", r"\belif\b", r"\belse\b", r"\bfor\b", r"\bwhile\b",
        r"\btry\b", r"\bexcept\b", r"\bcatch\b", r"\bcase\b",
        r"\bswitch\b", r"&&", r"\|\|", r"\?.*:",  # ternary
    ]
    control_count = sum(len(re.findall(p, code)) for p in control_patterns)

    # Function/class definitions
    func_patterns = [
        r"\bdef\s+(\w+)", r"\bfunction\s+(\w+)", r"\bclass\s+(\w+)",
        r"\bconst\s+(\w+)\s*=\s*\(.*\)\s*=>",
        r"\b(public|private|protected)\s+\w+\s+(\w+)\s*\(",
    ]
    functions = []
    for p in func_patterns:
        functions.extend(re.findall(p, code))
    # Flatten tuples from capture groups
    new_functions = [f if isinstance(f, str) else f[-1] for f in functions if f]

    # Import/dependency analysis
    import_patterns = [
        r"\bimport\s+(.+)", r"\bfrom\s+(\S+)\s+import",
        r"\brequire\s*\(\s*['\"](.+)['\"]\s*\)", r"#include\s*[<\"](.+)[>\"]",
    ]
    imports = []
    for p in import_patterns:
        imports.extend(re.findall(p, code))

    # Nesting depth estimate (cognitive complexity)
    max_depth = 0
    current_depth = 0
    for line in added_lines:
        stripped = line.strip()
        indent = len(line) - len(line.lstrip())
        # Very rough nesting estimate based on indent level
        estimated_depth = indent // 4
        max_depth = max(max_depth, estimated_depth)

    cognitive = control_count + max_depth * 2

    # Code vs comment ratio
    comment_patterns = [r"^\s*#", r"^\s*//", r"^\s*/\*", r"^\s*\*", r'^\s*"""', r"^\s*'''"]
    comment_lines = sum(
        1 for line in added_lines
        if any(re.match(p, line) for p in comment_patterns)
    )
    code_lines = len(added_lines) - comment_lines
    code_to_comment = round(code_lines / max(comment_lines, 1), 2)

    return {
        "cyclomatic_complexity": control_count,
        "cognitive_complexity": cognitive,
        "new_functions": new_functions[:10],  # cap list size
        "new_dependencies": imports[:10],
        "nesting_depth_estimate": max_depth,
        "code_to_comment_ratio": code_to_comment,
        "total_added_lines": len(added_lines),
        "comment_lines": comment_lines,
    }


# ─── Stage 3: Statistical Analysis ───────────────────────────────────────────

def _detect_size_anomaly(commit_size: int, author_sizes: List[int]) -> dict:
    """Flag if commit size is >2σ from author's mean."""
    if len(author_sizes) < 3:
        return {"size_anomaly": False, "z_score": 0.0}
    mean = sum(author_sizes) / len(author_sizes)
    variance = sum((s - mean) ** 2 for s in author_sizes) / len(author_sizes)
    std = variance ** 0.5
    if std == 0:
        return {"size_anomaly": False, "z_score": 0.0}
    z = (commit_size - mean) / std
    return {"size_anomaly": abs(z) > 2.0, "z_score": round(z, 2)}


def _detect_burst(timestamps: List[str], current_time: str, same_author_times: List[str]) -> dict:
    """Detect burst commits: >5 by same author within 30 minutes."""
    if not same_author_times:
        return {"burst_commit": False, "burst_size": 0}

    try:
        current_dt = datetime.fromisoformat(current_time)
        nearby = 0
        for ts in same_author_times:
            dt = datetime.fromisoformat(ts)
            diff_minutes = abs((current_dt - dt).total_seconds()) / 60
            if diff_minutes <= 30:
                nearby += 1
        return {"burst_commit": nearby > 5, "burst_size": nearby}
    except (ValueError, TypeError):
        return {"burst_commit": False, "burst_size": 0}


def _compute_change_entropy(files_changed: List[dict]) -> float:
    """Shannon entropy of file changes — measures spread vs focus."""
    if not files_changed:
        return 0.0
    import math
    dirs = [os.path.dirname(f["filename"]) or "root" for f in files_changed]
    counts = Counter(dirs)
    total = sum(counts.values())
    entropy = -sum(
        (c / total) * math.log2(c / total)
        for c in counts.values() if c > 0
    )
    return round(entropy, 3)


# ─── Stage 4: Cross-Commit Analysis ──────────────────────────────────────────

def _tokenize_for_similarity(patch: str) -> Set[str]:
    """Tokenize patch for Jaccard similarity — normalize whitespace, lowercase."""
    tokens = set()
    for line in patch.split("\n"):
        if line.startswith("+") and not line.startswith("+++"):
            # Normalize: lowercase, strip whitespace, split on non-alphanum
            normalized = re.sub(r"\s+", " ", line[1:].strip().lower())
            words = re.findall(r"\w+", normalized)
            tokens.update(words)
    return tokens


def _jaccard_similarity(set_a: Set[str], set_b: Set[str]) -> float:
    """Jaccard coefficient between two token sets."""
    if not set_a or not set_b:
        return 0.0
    intersection = set_a & set_b
    union = set_a | set_b
    return round(len(intersection) / len(union), 3) if union else 0.0


def _file_set_similarity(files_a: List[str], files_b: List[str]) -> float:
    """Jaccard similarity between two file lists."""
    set_a = set(files_a)
    set_b = set(files_b)
    if not set_a or not set_b:
        return 0.0
    return round(len(set_a & set_b) / len(set_a | set_b), 3)


# ─── Stage 5: Feature Engineering ────────────────────────────────────────────

def _compute_pre_filter_flags(data: dict) -> dict:
    """Compute all boolean pre-filter flags."""
    changes = data.get("changes", {})
    message = data.get("message", {})
    timestamps = data.get("timestamps", {})
    author = data.get("author", {})
    committer = data.get("committer", {})

    subject = message.get("subject", "")
    body = message.get("body", "")
    lines_added = changes.get("lines_added", 0)
    lines_deleted = changes.get("lines_deleted", 0)
    total_files = changes.get("total_files", 0)
    hour = timestamps.get("hour_of_day", 12)

    flags = {
        "empty_message": len(subject.strip()) < 5,
        "no_body": body.strip() == "",
        "possible_whitespace_spam": (lines_added > 100 and total_files > 5 and len(subject) < 15),
        "noise_inflation": (lines_added > 500 and len(subject.split()) <= 3),
        "proxy_commit": (author.get("email", "") != committer.get("email", "")),
        "fix_without_deletion": ("fix" in subject.lower() and lines_deleted == 0),
        "late_night_commit": (hour >= 23 or hour <= 4),
        "trivial_commit": (lines_added <= 1 and lines_deleted <= 1),
    }
    return flags


def _compute_sentiment(message: dict) -> dict:
    """Analyze commit message tone using keyword heuristics."""
    full_text = (message.get("subject", "") + " " + message.get("body", "")).lower()
    words = set(re.findall(r"\w+", full_text))

    neg_hits = words & NEGATIVE_MARKERS
    pos_hits = words & POSITIVE_MARKERS
    has_frustration = bool(FRUSTRATION_PATTERNS.search(full_text))

    if neg_hits or has_frustration:
        tone = "negative"
    elif pos_hits:
        tone = "positive"
    else:
        tone = "neutral"

    professional = not bool(neg_hits) and not has_frustration

    return {
        "tone": tone,
        "professional": professional,
        "has_frustration_markers": has_frustration,
    }


def _compute_feature_vector(flags: dict, structural: dict, sentiment: dict,
                            data: dict, anomaly: dict, clone_sim: float) -> dict:
    """Compute normalized feature scores for LLM context."""
    changes = data.get("changes", {})
    lines_added = changes.get("lines_added", 0)
    total_files = changes.get("total_files", 0)

    # Structural complexity: 0-1
    cyc = structural.get("cyclomatic_complexity", 0)
    cog = structural.get("cognitive_complexity", 0)
    num_funcs = len(structural.get("new_functions", []))
    has_tests = any(
        any(p in f["filename"].lower() for p in ["test", "spec"])
        for f in data.get("changes", {}).get("files_changed", [])
    )
    structural_complexity = min(1.0, (
        min(cyc / 20, 1.0) * 0.3 +
        min(cog / 30, 1.0) * 0.3 +
        min(num_funcs / 5, 1.0) * 0.2 +
        (0.2 if has_tests else 0.0)
    ))

    # Commit hygiene: 0-1
    subject = data.get("message", {}).get("subject", "")
    has_body = data.get("message", {}).get("body", "").strip() != ""
    flag_count = sum(1 for v in flags.values() if v)
    commit_hygiene = min(1.0, (
        (0.3 if len(subject) > 10 else 0.0) +
        (0.2 if has_body else 0.0) +
        max(0, 1 - flag_count / 8) * 0.3 +
        (0.2 if structural.get("code_to_comment_ratio", 99) < 15 else 0.0)
    ))

    # Diff quality: 0-1
    has_logic = cyc > 0
    has_source = any(
        os.path.splitext(f["filename"])[1].lower() in FILE_CATEGORIES["source"]
        for f in data.get("changes", {}).get("files_changed", [])
    )
    reasonable_size = 5 < lines_added < 500
    not_clone = clone_sim < 0.7
    diff_quality = (
        0.30 * (1 if has_logic else 0) +
        0.20 * (1 if has_source else 0) +
        0.20 * (1 if reasonable_size else 0) +
        0.15 * (1 if not_clone else 0) +
        0.15 * (1 if not anomaly.get("size_anomaly", False) else 0)
    )

    return {
        "structural_complexity": round(structural_complexity, 3),
        "commit_hygiene": round(commit_hygiene, 3),
        "diff_quality": round(diff_quality, 3),
        "anomaly_score": round(abs(anomaly.get("z_score", 0)) / 5, 3),
    }


# ─── Main Pipeline ───────────────────────────────────────────────────────────

def preprocess_all_commits(input_folder: str, output_folder: str) -> None:
    """
    Run the 5-stage preprocessing pipeline on all raw commits.

    Reads from input_folder (data/raw_commits/),
    writes enriched JSONs to output_folder (data/preprocessed_commits/).
    """
    os.makedirs(output_folder, exist_ok=True)

    # Load all commits for cross-commit analysis
    files = sorted(f for f in os.listdir(input_folder) if f.endswith(".json"))
    if not files:
        logger.warning("  ⚠ No commits found to preprocess")
        return

    all_commits = []
    for fname in files:
        try:
            data = load_json(os.path.join(input_folder, fname))
            all_commits.append(data)
        except Exception as e:
            logger.warning(f"  ⚠ Skipping {fname}: {e}")

    # Sort by date for temporal analysis
    all_commits.sort(key=lambda c: c.get("timestamps", {}).get("authored_date", ""))

    # Pre-compute per-author data for cross-commit analysis
    author_commits = defaultdict(list)
    author_sizes = defaultdict(list)
    author_timestamps = defaultdict(list)
    author_token_sets = defaultdict(list)

    for commit in all_commits:
        email = commit.get("author", {}).get("email", "unknown")
        size = commit.get("changes", {}).get("lines_added", 0) + \
               commit.get("changes", {}).get("lines_deleted", 0)
        author_sizes[email].append(size)
        author_timestamps[email].append(
            commit.get("timestamps", {}).get("authored_date", "")
        )
        author_commits[email].append(commit)

    prev_by_author = {}  # Track previous commit per author for similarity

    for i, data in enumerate(all_commits):
        short_hash = data.get("short_hash", "???")
        email = data.get("author", {}).get("email", "unknown")
        patch = data.get("changes", {}).get("patch", "")

        # ── Stage 2: Structural ──
        structural = _analyze_code_complexity(patch)
        languages = _detect_languages(data.get("changes", {}).get("files_changed", []))
        file_cats = _categorize_files(data.get("changes", {}).get("files_changed", []))

        # ── Stage 3: Statistical ──
        commit_size = data.get("changes", {}).get("lines_added", 0) + \
                      data.get("changes", {}).get("lines_deleted", 0)
        anomaly = _detect_size_anomaly(commit_size, author_sizes[email])
        burst = _detect_burst(
            [], data.get("timestamps", {}).get("authored_date", ""),
            author_timestamps[email]
        )
        entropy = _compute_change_entropy(data.get("changes", {}).get("files_changed", []))

        # ── Stage 4: Cross-Commit ──
        current_tokens = _tokenize_for_similarity(patch)
        clone_similarity = 0.0
        similar_to = None
        if email in prev_by_author:
            prev = prev_by_author[email]
            prev_tokens = _tokenize_for_similarity(
                prev.get("changes", {}).get("patch", "")
            )
            clone_similarity = _jaccard_similarity(current_tokens, prev_tokens)
            if clone_similarity > 0.7:
                similar_to = prev.get("short_hash")

        # Build-on-others detection
        current_files = [f["filename"] for f in data.get("changes", {}).get("files_changed", [])]
        builds_on = []
        for other_email, other_commits in author_commits.items():
            if other_email == email:
                continue
            for oc in other_commits[-5:]:  # Check last 5 commits from each other author
                oc_date = oc.get("timestamps", {}).get("authored_date", "")
                my_date = data.get("timestamps", {}).get("authored_date", "")
                if oc_date and my_date and oc_date < my_date:
                    oc_files = [f["filename"] for f in oc.get("changes", {}).get("files_changed", [])]
                    if _file_set_similarity(current_files, oc_files) > 0.3:
                        builds_on.append(other_email)
                        break

        # Detect likely reverts
        likely_revert = False
        reverts_hash = None
        if email in prev_by_author:
            prev = prev_by_author[email]
            prev_added = prev.get("changes", {}).get("lines_added", 0)
            my_deleted = data.get("changes", {}).get("lines_deleted", 0)
            if prev_added > 5 and abs(my_deleted - prev_added) <= 2:
                prev_files = [f["filename"] for f in prev.get("changes", {}).get("files_changed", [])]
                if _file_set_similarity(current_files, prev_files) > 0.8:
                    likely_revert = True
                    reverts_hash = prev.get("short_hash")

        prev_by_author[email] = data

        # ── Stage 5: Feature Engineering ──
        flags = _compute_pre_filter_flags(data)
        flags["possible_clone"] = clone_similarity > 0.7
        flags["burst_commit"] = burst["burst_commit"]
        flags["size_anomaly"] = anomaly["size_anomaly"]
        flags["likely_revert"] = likely_revert
        flag_count = sum(1 for v in flags.values() if v)

        sentiment = _compute_sentiment(data.get("message", {}))

        feature_vector = _compute_feature_vector(
            flags, structural, sentiment, data, anomaly, clone_similarity
        )

        # ── Enrich the commit JSON ──
        enriched = {**data}
        # Remove old integrity signature before re-signing
        enriched.pop("_integrity", None)

        enriched["detected_languages"] = languages
        enriched["file_categories"] = file_cats
        enriched["structural_analysis"] = structural
        enriched["statistical_analysis"] = {
            **anomaly,
            **burst,
            "change_entropy": entropy,
        }
        enriched["cross_commit_analysis"] = {
            "clone_similarity": clone_similarity,
            "similar_to": similar_to,
            "builds_on": builds_on,
            "collaboration_score": min(1.0, len(builds_on) * 0.3),
            "likely_revert": likely_revert,
            "reverts_hash": reverts_hash,
        }
        enriched["pre_filter_flags"] = flags
        enriched["flag_count"] = flag_count
        enriched["sentiment"] = sentiment
        enriched["feature_vector"] = feature_vector

        enriched = sign_output(enriched, "preprocessing")

        out_path = os.path.join(output_folder, f"{short_hash}.json")
        save_json(enriched, out_path)

    logger.info(f"  ✓ Preprocessed {len(all_commits)} commits")
