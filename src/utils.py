"""
utils.py — Shared helpers: logging, caching, config loading, and common utilities.
All modules import from here to avoid duplication.
"""

import os
import json
import hashlib
import logging
from datetime import datetime
from typing import Any, Optional


# ─── Structured Logger ───────────────────────────────────────────────────────

def get_logger(name: str) -> logging.Logger:
    """Create a structured logger with file + console handlers."""
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger
    logger.setLevel(logging.DEBUG)

    # Console handler — INFO level, concise
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    ch.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(ch)

    # File handler — DEBUG level, detailed
    log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    os.makedirs(log_dir, exist_ok=True)
    fh = logging.FileHandler(os.path.join(log_dir, "pipeline.log"), encoding="utf-8")
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(logging.Formatter(
        "%(asctime)s | %(name)s | %(levelname)s | %(message)s"
    ))
    logger.addHandler(fh)

    return logger


# ─── LLM Response Cache ──────────────────────────────────────────────────────

class LLMCache:
    """Hash-keyed JSON cache for LLM responses. Prevents redundant calls."""

    def __init__(self, cache_dir: str = "data/.cache"):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
        self._hits = 0
        self._misses = 0

    def _key(self, prompt: str, model: str) -> str:
        content = f"{model}:{prompt}"
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    def get(self, prompt: str, model: str) -> Optional[dict]:
        """Return cached response or None."""
        path = os.path.join(self.cache_dir, f"{self._key(prompt, model)}.json")
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    self._hits += 1
                    return json.load(f)
            except (json.JSONDecodeError, OSError):
                pass
        self._misses += 1
        return None

    def set(self, prompt: str, model: str, response: dict) -> None:
        """Cache a response."""
        path = os.path.join(self.cache_dir, f"{self._key(prompt, model)}.json")
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(response, f, indent=2)
        except OSError:
            pass

    @property
    def stats(self) -> dict:
        return {"hits": self._hits, "misses": self._misses,
                "hit_rate": self._hits / max(1, self._hits + self._misses)}


# ─── Config Loader ────────────────────────────────────────────────────────────

def load_rubric(rubric_path: str = None) -> dict:
    """Load the rubric JSON config. Returns default if file missing."""
    if rubric_path is None:
        rubric_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "prompts", "rubrics", "code_quality.json"
        )
    try:
        with open(rubric_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {
            "dimensions": [
                {"name": "complexity", "weight": 0.35},
                {"name": "integrity", "weight": 0.25},
                {"name": "impact", "weight": 0.30},
            ],
            "effort_spread_weight": 0.10,
            "grade_thresholds": {"A+": 4.5, "A": 4.0, "B+": 3.5, "B": 3.0, "C": 2.5, "D": 0},
        }


def get_rubric_context(rubric: dict) -> str:
    """Format rubric as text for inclusion in LLM prompts."""
    lines = ["RUBRIC:"]
    for dim in rubric.get("dimensions", []):
        name = dim["name"].capitalize()
        descriptors = dim.get("descriptors", {})
        desc_text = ", ".join(f"{k}={v}" for k, v in sorted(descriptors.items()))
        lines.append(f"  {name} (1-5): {desc_text}")
    return "\n".join(lines)


# ─── Pipeline State ───────────────────────────────────────────────────────────

class PipelineState:
    """Track incremental analysis state — only process new commits."""

    STATE_FILE = "data/.state.json"

    def __init__(self):
        self.state = self._load()

    def _load(self) -> dict:
        if os.path.exists(self.STATE_FILE):
            try:
                with open(self.STATE_FILE, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, OSError):
                pass
        return {"last_commit_hash": None, "last_run": None, "total_analyzed": 0}

    def save(self, last_hash: str = None, total: int = 0):
        self.state["last_commit_hash"] = last_hash or self.state.get("last_commit_hash")
        self.state["last_run"] = datetime.now().isoformat()
        self.state["total_analyzed"] = total or self.state.get("total_analyzed", 0)
        os.makedirs(os.path.dirname(self.STATE_FILE) or ".", exist_ok=True)
        with open(self.STATE_FILE, "w") as f:
            json.dump(self.state, f, indent=2)

    @property
    def last_commit(self) -> Optional[str]:
        return self.state.get("last_commit_hash")


# ─── JSON Helpers ─────────────────────────────────────────────────────────────

def load_json(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(data: dict, path: str) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str, ensure_ascii=False)


def now_iso() -> str:
    return datetime.now().isoformat()
