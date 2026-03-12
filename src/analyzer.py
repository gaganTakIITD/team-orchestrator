"""
analyzer.py — 3-Pass AI Evaluation Pipeline.
Pass 1: Spam detection (phi3 — fast)
Pass 2: Quality scoring (llama3.1 — deep)
Pass 3: Coaching feedback (llama3.1 — only when needed)
With confidence scores, self-consistency checks, caching, and retries.
"""

import os
import re
import json
import time
from typing import Optional

from langchain_ollama import OllamaLLM

from src.utils import get_logger, load_json, save_json, LLMCache, load_rubric, get_rubric_context
from src.security import (
    sanitize_for_llm, sign_output, audit_log, enforce_offline,
    validate_json_response
)

logger = get_logger("analyzer")

OLLAMA_BASE_URL = "http://localhost:11434"

# ─── LLM Response Parsing ────────────────────────────────────────────────────

def _parse_llm_json(raw: str, defaults: dict) -> dict:
    """
    Robust JSON parser for LLM responses.
    Handles: markdown fences, mixed text, missing keys, out-of-range scores.
    """
    if not raw:
        return defaults.copy()

    # Strip markdown code fences
    text = re.sub(r"^```\w*\n?", "", raw.strip(), flags=re.MULTILINE)
    text = text.rstrip("`").strip()

    result = None

    # Try direct parse
    try:
        result = json.loads(text)
    except json.JSONDecodeError:
        # Try extracting JSON from mixed text
        match = re.search(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", text, re.DOTALL)
        if match:
            try:
                result = json.loads(match.group())
            except json.JSONDecodeError:
                pass

    if not result or not isinstance(result, dict):
        return defaults.copy()

    # Fill missing keys with defaults
    for key, default_val in defaults.items():
        if key not in result:
            result[key] = default_val

    # Clamp numeric scores to valid range
    for key in ["complexity", "integrity", "impact"]:
        if key in result:
            try:
                result[key] = max(1, min(5, int(float(result[key]))))
            except (ValueError, TypeError):
                result[key] = defaults.get(key, 2)

    if "confidence" in result:
        try:
            result["confidence"] = max(0.0, min(1.0, float(result["confidence"])))
        except (ValueError, TypeError):
            result["confidence"] = 0.5

    return result


# ─── LLM Call with Retry ─────────────────────────────────────────────────────

def _call_llm(model: OllamaLLM, prompt: str, model_name: str,
              cache: LLMCache, max_retries: int = 3) -> str:
    """Call Ollama with retry and caching."""
    # Check cache
    cached = cache.get(prompt, model_name)
    if cached is not None:
        return json.dumps(cached)

    # Retry loop
    for attempt in range(max_retries):
        try:
            start = time.time()
            response = model.invoke(prompt)
            latency = int((time.time() - start) * 1000)

            audit_log("llm_call", {
                "model": model_name,
                "input": prompt[:100],
                "success": True,
                "latency_ms": latency,
            })

            # Cache the parsed response
            parsed = validate_json_response(response)
            if parsed:
                cache.set(prompt, model_name, parsed)

            return response

        except Exception as e:
            wait = (2 ** attempt) * 1
            if "connection" in str(e).lower() or "refused" in str(e).lower():
                logger.warning(
                    f"  ⚠ Ollama connection failed (attempt {attempt + 1}/{max_retries}). "
                    f"Make sure Ollama is running: ollama serve"
                )
            else:
                logger.warning(f"  ⚠ LLM error (attempt {attempt + 1}): {e}")

            audit_log("llm_call", {
                "model": model_name,
                "success": False,
                "error": str(e),
            })

            if attempt < max_retries - 1:
                time.sleep(wait)

    return ""


# ─── Pass 1: Spam Check ──────────────────────────────────────────────────────

def _spam_check(data: dict, fast_model: OllamaLLM, cache: LLMCache) -> dict:
    """Run spam detection using phi3 (fast model)."""
    changes = data.get("changes", {})
    message = data.get("message", {})
    flags = data.get("pre_filter_flags", {})
    burst = data.get("statistical_analysis", {}).get("burst_commit", False)

    active_flags = [k for k, v in flags.items() if v]
    patch_snippet = sanitize_for_llm(changes.get("patch", ""), max_len=1500)

    prompt = f"""You are a git commit spam detector for a STEM hackathon evaluation system.
Analyze this commit and determine if it is spam (meaningless, auto-generated,
padding, noise inflation, or copied content with no real contribution).

IMPORTANT: A commit is NOT spam just because it has a short message.
Focus primarily on the ACTUAL CODE DIFF below. If the diff shows real logic
changes, functions, algorithms, or meaningful code modifications, it is NOT spam
regardless of the commit message quality.

COMMIT SUBJECT: {sanitize_for_llm(message.get('subject', ''), 200)}
STATS: +{changes.get('lines_added', 0)} -{changes.get('lines_deleted', 0)} across {changes.get('total_files', 0)} files
PRE-FILTER FLAGS: {data.get('flag_count', 0)} triggered → {', '.join(active_flags) or 'none'}
BURST COMMIT: {burst}

CODE DIFF (first 1500 chars):
~~~
{patch_snippet}
~~~

Consider:
- Does the diff contain real logic changes, functions, classes, or algorithms?
- Is this actual working code with imports, control flow, or data processing?
- Even if the message is vague, does the CODE itself show real development work?
- Only flag as spam if the diff is truly empty, whitespace-only, or auto-generated.

Respond with ONLY this JSON, nothing else:
{{"is_spam": true/false, "confidence": 0.0-1.0, "reason": "one sentence"}}"""

    defaults = {"is_spam": False, "confidence": 0.5, "reason": "Could not determine"}

    response = _call_llm(fast_model, prompt, "phi3", cache)
    result = _parse_llm_json(response, defaults)

    return result


# ─── Pass 2: Quality Scoring ─────────────────────────────────────────────────

def _quality_score(data: dict, deep_model: OllamaLLM, cache: LLMCache,
                   rubric: dict) -> dict:
    """Run quality scoring using llama3.1 (deep model)."""
    changes = data.get("changes", {})
    message = data.get("message", {})
    structural = data.get("structural_analysis", {})
    cross = data.get("cross_commit_analysis", {})
    fv = data.get("feature_vector", {})
    flags = data.get("pre_filter_flags", {})
    sentiment = data.get("sentiment", {})

    active_flags = [k for k, v in flags.items() if v]
    filenames = [f["filename"] for f in changes.get("files_changed", [])]
    patch_snippet = sanitize_for_llm(changes.get("patch", ""), max_len=4000)
    rubric_text = get_rubric_context(rubric)

    prompt = f"""You are an expert code evaluator for a STEM hackathon peer feedback system.
Score this git commit on three rubric dimensions. Focus PRIMARILY on the actual
CODE DIFF below — the code changes are the most important factor, not just the
commit message.

AUTHOR: {sanitize_for_llm(data.get('author', {}).get('name', 'Unknown'), 100)}
COMMIT MESSAGE: {sanitize_for_llm(message.get('subject', ''), 200)}
BODY: {sanitize_for_llm(message.get('body', ''), 500)}
FILES CHANGED: {', '.join(filenames[:10])} ({data.get('file_categories', {})})
LINES: +{changes.get('lines_added', 0)} -{changes.get('lines_deleted', 0)}
LANGUAGES: {data.get('detected_languages', [])}

PREPROCESSING ANALYSIS:
- Cyclomatic complexity: {structural.get('cyclomatic_complexity', 0)}
- Cognitive complexity: {structural.get('cognitive_complexity', 0)}
- New functions/classes: {structural.get('new_functions', [])}
- New dependencies: {structural.get('new_dependencies', [])}
- Structural complexity score: {fv.get('structural_complexity', 0)}/1.0
- Commit hygiene score: {fv.get('commit_hygiene', 0)}/1.0
- Diff quality score: {fv.get('diff_quality', 0)}/1.0
- Collaboration signal: {cross.get('collaboration_score', 0)}
- Clone similarity to prior commits: {cross.get('clone_similarity', 0)}
- Sentiment: {sentiment.get('tone', 'neutral')}, professional={sentiment.get('professional', True)}

FLAGS: {', '.join(active_flags) or 'none'}

FULL CODE DIFF:
~~~
{patch_snippet}
~~~

{rubric_text}

IMPORTANT SCORING GUIDELINES:
- COMPLEXITY: Look at the actual code — are there algorithms, data structures,
  control flow, error handling, or complex logic? Score based on the CODE, not
  the commit message length.
- INTEGRITY: Does the commit message describe what the code actually does?
  A short but accurate message is fine (e.g. "fix: null check" with a null check
  in the diff = integrity 4-5).
- IMPACT: How much does this code change affect the project? New features,
  critical bug fixes, and architectural changes = high impact.

Score the commit on each dimension using the rubric descriptors above.
Also classify the commit type and explain your reasoning.

Respond with ONLY valid JSON, nothing else:
{{
  "complexity": <integer 1-5>,
  "integrity": <integer 1-5>,
  "impact": <integer 1-5>,
  "confidence": <float 0.0-1.0>,
  "type": "<feature|bugfix|refactor|test|docs|spam|trivial>",
  "reasoning": "<exactly two sentences explaining your scores>"
}}"""

    defaults = {
        "complexity": 2, "integrity": 2, "impact": 2,
        "confidence": 0.5, "type": "trivial",
        "reasoning": "Could not parse LLM response."
    }

    response = _call_llm(deep_model, prompt, "llama3.1", cache)
    result = _parse_llm_json(response, defaults)

    # Self-consistency check
    struct_complexity_est = fv.get("structural_complexity", 0) * 5
    if abs(result["complexity"] - struct_complexity_est) > 2.5 and struct_complexity_est > 0:
        logger.debug(f"  🔄 Self-consistency check triggered for {data.get('short_hash')}")
        reprompt = f"""Your previous scores seem inconsistent with the preprocessing analysis data.

The code has cyclomatic complexity {structural.get('cyclomatic_complexity', 0)} and cognitive
complexity {structural.get('cognitive_complexity', 0)}, with {len(structural.get('new_functions', []))} new functions,
but you scored complexity as {result['complexity']}/5.

The diff quality score from preprocessing is {fv.get('diff_quality', 0)}, but you scored
impact as {result['impact']}/5.

Please re-evaluate this commit carefully and respond with corrected JSON:
{{
  "complexity": <integer 1-5>,
  "integrity": <integer 1-5>,
  "impact": <integer 1-5>,
  "confidence": <float 0.0-1.0>,
  "type": "<feature|bugfix|refactor|test|docs|spam|trivial>",
  "reasoning": "<exactly two sentences>"
}}"""
        re_response = _call_llm(deep_model, reprompt, "llama3.1", cache)
        re_result = _parse_llm_json(re_response, defaults)
        if re_result.get("confidence", 0) > result.get("confidence", 0):
            result = re_result

    return result


# ─── Pass 3: Coaching Feedback ────────────────────────────────────────────────

def _coaching_feedback(data: dict, scores: dict, deep_model: OllamaLLM,
                       cache: LLMCache) -> Optional[dict]:
    """Generate constructive coaching feedback for below-average commits."""
    avg_score = (scores.get("complexity", 2) + scores.get("integrity", 2) +
                 scores.get("impact", 2)) / 3
    flag_count = data.get("flag_count", 0)
    confidence = scores.get("confidence", 1.0)

    # Trigger conditions
    if avg_score >= 3.5 and flag_count < 2 and confidence >= 0.7:
        return None

    dims = {"complexity": scores.get("complexity", 2),
            "integrity": scores.get("integrity", 2),
            "impact": scores.get("impact", 2)}
    weakest = min(dims, key=dims.get)

    flags = data.get("pre_filter_flags", {})
    active_flags = [k for k, v in flags.items() if v]
    patch_snippet = sanitize_for_llm(
        data.get("changes", {}).get("patch", ""), max_len=1000
    )

    prompt = f"""You are an AI coding coach helping students improve their STEM project
contributions. This commit needs improvement. Generate specific, encouraging,
and actionable feedback.

COMMIT: "{sanitize_for_llm(data.get('message', {}).get('subject', ''), 200)}" by {sanitize_for_llm(data.get('author', {}).get('name', 'Unknown'), 100)}
SCORES: complexity={scores.get('complexity')}/5, integrity={scores.get('integrity')}/5, impact={scores.get('impact')}/5
TYPE: {scores.get('type', 'unknown')}
WEAKEST AREA: {weakest}
FLAGS: {', '.join(active_flags) or 'none'}

CODE SNIPPET:
~~~
{patch_snippet}
~~~

Guidelines for your feedback:
- Be specific — reference the actual code when possible
- Be encouraging — acknowledge what was done well
- Be actionable — give concrete steps they can take
- Suggest an improved commit message if integrity is low

Respond with ONLY valid JSON:
{{
  "strengths": ["1-2 specific things done well"],
  "improvements": ["1-2 specific actionable suggestions"],
  "learning_tip": "one practical technique for next time",
  "priority": "high|medium|low",
  "example_improved_message": "suggested better commit message if applicable"
}}"""

    defaults = {
        "strengths": ["Effort was made"],
        "improvements": ["Consider breaking changes into smaller commits"],
        "learning_tip": "Review your diff before committing",
        "priority": "medium",
        "example_improved_message": ""
    }

    response = _call_llm(deep_model, prompt, "llama3.1", cache)
    return _parse_llm_json(response, defaults)


# ─── Main Pipeline ───────────────────────────────────────────────────────────

def analyze_all_commits(project_id: str, input_folder: str, output_folder: str) -> None:
    """
    Run 3-pass AI analysis on all preprocessed commits.
    Reads from input_folder (data/preprocessed_commits/),
    writes scored JSONs to output_folder and ingests to SQLite.
    """
    # Offline enforcement
    if not enforce_offline(OLLAMA_BASE_URL):
        logger.error("  ✗ Aborting: offline enforcement failed")
        return

    os.makedirs(output_folder, exist_ok=True)
    cache = LLMCache()
    rubric = load_rubric()

    # Initialize models
    try:
        fast_model = OllamaLLM(model="phi3", temperature=0.1, base_url=OLLAMA_BASE_URL)
        deep_model = OllamaLLM(model="llama3.1", temperature=0.1, base_url=OLLAMA_BASE_URL)
    except Exception as e:
        logger.error(f"  ✗ Failed to initialize Ollama models: {e}")
        logger.error("  Make sure Ollama is running: ollama serve")
        return

    files = sorted(f for f in os.listdir(input_folder) if f.endswith(".json"))
    total = len(files)

    if total == 0:
        logger.warning("  ⚠ No preprocessed commits found")
        return

    for idx, fname in enumerate(files, 1):
        short_hash = fname.replace(".json", "")
        out_path = os.path.join(output_folder, fname)

        # Skip-if-scored
        if os.path.exists(out_path):
            try:
                existing = load_json(out_path)
                if "llm_scores" in existing:
                    logger.info(f"  [{idx}/{total}] {short_hash} — skipped (already scored)")
                    if project_id:
                        from src.project_store import ingest_scored_commits
                        ingest_scored_commits(project_id, [existing])
                    continue
            except Exception:
                pass

        logger.info(f"  [{idx}/{total}] Analyzing {short_hash}...")

        try:
            data = load_json(os.path.join(input_folder, fname))
        except Exception as e:
            logger.warning(f"  ⚠ Skipping {fname}: {e}")
            continue

        # Skip deep analysis for merge commits
        if data.get("is_merge_commit", False):
            data["llm_scores"] = {
                "complexity": 1, "integrity": 3, "impact": 1,
                "confidence": 1.0, "type": "trivial",
                "reasoning": "Merge commit — no unique code changes to evaluate."
            }
            data["spam_check"] = {"is_spam": False, "confidence": 1.0, "reason": "Merge commit"}
            data["coaching_feedback"] = None
            data.pop("_integrity", None)
            data = sign_output(data, "analysis")
            save_json(data, out_path)
            if project_id:
                from src.project_store import ingest_scored_commits
                ingest_scored_commits(project_id, [data])
            continue

        # PASS 1: Spam check (lightweight signal — never skip Pass 2)
        spam = _spam_check(data, fast_model, cache)
        data["spam_check"] = spam

        # ALWAYS run Pass 2 quality scoring — the deep model with full code
        # diff is the authoritative evaluation, not the quick spam check.
        # Spam is only a signal that Pass 2 may want to consider.

        if spam.get("is_spam", False):
            logger.debug(f"  🔍 Spam signal for {short_hash} (conf={spam.get('confidence', 0):.2f}), "
                         f"running deep analysis to confirm...")

        # PASS 2: Quality scoring (always runs — this is the core evaluation)
        scores = _quality_score(data, deep_model, cache, rubric)

        # If Pass 2 found real quality AND spam check flagged it,
        # trust the deep model — override spam
        avg_score = (scores.get("complexity", 1) + scores.get("integrity", 1) + scores.get("impact", 1)) / 3
        if spam.get("is_spam", False) and avg_score >= 2.5:
            # Deep model found real quality — override spam
            spam["is_spam"] = False
            spam["reason"] = f"Overridden by deep analysis (avg score {avg_score:.1f})"
            data["spam_check"] = spam
            logger.debug(f"  ✓ Spam override for {short_hash}: deep model scored {avg_score:.1f}")
        elif spam.get("is_spam", False) and spam.get("confidence", 0) >= 0.9 and avg_score < 2.0:
            # Both models agree it's spam — mark as spam
            scores["type"] = "spam"

        data["llm_scores"] = scores

        # PASS 3: Coaching (conditional)
        coaching = _coaching_feedback(data, scores, deep_model, cache)
        data["coaching_feedback"] = coaching

        data.pop("_integrity", None)
        data = sign_output(data, "analysis")
        save_json(data, out_path)
        if project_id:
            from src.project_store import ingest_scored_commits
            ingest_scored_commits(project_id, [data])

    # Log cache stats
    stats = cache.stats
    logger.info(
        f"  📊 Cache stats: {stats['hits']} hits, {stats['misses']} misses "
        f"({stats['hit_rate']:.0%} hit rate)"
    )

    audit_log("analysis_complete", {
        "total_commits": total,
        "cache_hits": stats["hits"],
        "cache_misses": stats["misses"],
        "success": True,
    })
