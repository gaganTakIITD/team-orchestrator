"""
extractor.py — Stage 1: Git Extraction.
Reads a git repo, iterates all commits on the active branch, and saves
one structured JSON per commit to data/raw_commits/.
Handles: first commit (NULL_TREE), merge commits, binary diffs, encoding errors,
branch auto-detection (main → master → HEAD → first available).
"""

import os
import json
from datetime import datetime
from typing import Optional

import git

from src.utils import get_logger, save_json, now_iso
from src.security import sanitize_author_info, validate_repo_path, sign_output, audit_log

logger = get_logger("extractor")


def _detect_branch(repo: git.Repo) -> str:
    """Auto-detect the active branch: main → master → HEAD → first available."""
    for candidate in ["main", "master"]:
        if candidate in [ref.name for ref in repo.references]:
            return candidate
    try:
        return repo.active_branch.name
    except TypeError:
        # Detached HEAD
        pass
    branches = [ref.name for ref in repo.branches]
    if branches:
        return branches[0]
    return "HEAD"


def _safe_decode_patch(diff_obj) -> str:
    """Safely extract patch text from a diff object."""
    try:
        if diff_obj.diff:
            if isinstance(diff_obj.diff, bytes):
                return diff_obj.diff.decode("utf-8", errors="replace")
            return str(diff_obj.diff)
    except Exception:
        pass
    return ""


def _extract_single_commit(commit: git.Commit, repo: git.Repo) -> dict:
    """Extract structured data from a single git commit."""
    # Author / committer info
    author_name, author_email = sanitize_author_info(
        commit.author.name if commit.author else "Unknown",
        commit.author.email if commit.author else "unknown@unknown"
    )
    committer_name, committer_email = sanitize_author_info(
        commit.committer.name if commit.committer else "Unknown",
        commit.committer.email if commit.committer else "unknown@unknown"
    )

    # Timestamps
    authored_date = datetime.fromtimestamp(commit.authored_date)
    committed_date = datetime.fromtimestamp(commit.committed_date)

    # Message parsing
    full_message = commit.message or ""
    message_lines = full_message.strip().split("\n")
    subject = message_lines[0].strip() if message_lines else ""
    body = "\n".join(message_lines[2:]).strip() if len(message_lines) > 2 else ""

    # Merge commit detection
    is_merge = len(commit.parents) > 1

    # Diff extraction
    files_changed = []
    patch_parts = []
    try:
        if commit.parents:
            diffs = commit.parents[0].diff(commit, create_patch=True)
        else:
            diffs = commit.diff(git.NULL_TREE, create_patch=True)

        for d in diffs:
            change_type = d.change_type or "M"
            filename = d.b_path or d.a_path or "unknown"
            files_changed.append({
                "filename": filename,
                "change_type": change_type,
            })
            patch_text = _safe_decode_patch(d)
            if patch_text:
                patch_parts.append(patch_text)
    except Exception as e:
        logger.warning(f"  ⚠ Error reading diffs for {commit.hexsha[:7]}: {e}")

    # Stats
    try:
        stats = commit.stats
        lines_added = stats.total.get("insertions", 0)
        lines_deleted = stats.total.get("deletions", 0)
    except Exception:
        lines_added = 0
        lines_deleted = 0

    # Combine patches, truncate to 6000 chars for thorough AI analysis
    full_patch = "\n".join(patch_parts)
    if len(full_patch) > 6000:
        full_patch = full_patch[:6000] + "\n... [TRUNCATED]"

    return {
        "hash": commit.hexsha,
        "short_hash": commit.hexsha[:7],
        "author": {"name": author_name, "email": author_email},
        "committer": {"name": committer_name, "email": committer_email},
        "timestamps": {
            "authored_date": authored_date.isoformat(),
            "committed_date": committed_date.isoformat(),
            "hour_of_day": authored_date.hour,
            "day_of_week": authored_date.strftime("%A"),
        },
        "message": {
            "full": full_message.strip(),
            "subject": subject,
            "body": body,
        },
        "changes": {
            "files_changed": files_changed,
            "total_files": len(files_changed),
            "lines_added": lines_added,
            "lines_deleted": lines_deleted,
            "patch": full_patch,
        },
        "is_merge_commit": is_merge,
    }


def extract_all_commits(repo_path: str, output_folder: str) -> int:
    """
    Extract all commits from a git repo to individual JSON files.

    Args:
        repo_path: Path to the git repository.
        output_folder: Folder to save commit JSONs (e.g., data/raw_commits/).

    Returns:
        Number of commits extracted.
    """
    # Validate repo path
    valid, error = validate_repo_path(repo_path)
    if not valid:
        logger.error(f"  ✗ {error}")
        return 0

    os.makedirs(output_folder, exist_ok=True)

    try:
        repo = git.Repo(repo_path)
    except git.InvalidGitRepositoryError:
        logger.error(f"  ✗ Invalid git repository: {repo_path}")
        return 0

    # Detect branch
    branch = _detect_branch(repo)
    logger.info(f"  📂 Using branch: {branch}")

    # Iterate commits
    try:
        commits = list(repo.iter_commits(branch))
    except git.GitCommandError as e:
        logger.error(f"  ✗ Could not read branch '{branch}': {e}")
        return 0

    if not commits:
        logger.warning("  ⚠ Repository has no commits")
        return 0

    count = 0
    for commit in commits:
        try:
            data = _extract_single_commit(commit, repo)
            data = sign_output(data, "extraction")

            out_path = os.path.join(output_folder, f"{data['short_hash']}.json")
            save_json(data, out_path)
            count += 1
        except Exception as e:
            logger.warning(f"  ⚠ Skipping commit {commit.hexsha[:7]}: {e}")

    audit_log("extract_commits", {
        "repo_path": repo_path,
        "branch": branch,
        "total_commits": count,
        "success": True,
    })

    return count
