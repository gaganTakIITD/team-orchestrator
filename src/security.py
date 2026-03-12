"""
security.py — 4-Layer Security: input sanitization, prompt sandboxing,
pipeline integrity (HMAC), encryption at rest, audit trail, offline enforcement.
"""

import os
import re
import json
import hmac
import hashlib
from datetime import datetime
from typing import Optional

from cryptography.fernet import Fernet

from src.utils import get_logger

logger = get_logger("security")


# ─── Layer 1: Input Sanitization ─────────────────────────────────────────────

def sanitize_for_llm(text: str, max_len: int = 3000) -> str:
    """
    Sanitize user-derived content before inserting into LLM prompts.
    Strips binary, control chars, escapes prompt delimiters, truncates.
    """
    if not text:
        return ""
    # Force valid UTF-8
    text = text.encode("utf-8", errors="replace").decode("utf-8")
    # Strip null bytes and control characters (keep newlines and tabs)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    # Escape prompt template delimiters to prevent injection
    text = text.replace("{", "⦃").replace("}", "⦄")
    # Prevent markdown fence breaking
    text = text.replace("```", "` ` `")
    # Neutralize role injection attempts
    text = re.sub(r"(SYSTEM|ASSISTANT|USER|HUMAN)\s*:", r"[\1]:", text, flags=re.IGNORECASE)
    # Neutralize instruction injection
    text = re.sub(r"(ignore|forget|disregard)\s+(all\s+)?(previous|above|prior)",
                  "[FILTERED]", text, flags=re.IGNORECASE)
    # Truncate
    return text[:max_len]


def sanitize_author_info(name: str, email: str) -> tuple:
    """Strip special characters from author fields."""
    clean_name = re.sub(r"[^\w\s\-.]", "", name or "Unknown")[:100]
    clean_email = re.sub(r"[^\w@.\-+]", "", email or "unknown@unknown")[:200]
    return clean_name, clean_email


def validate_repo_path(path: str) -> tuple:
    """
    Validate repo path is safe and is a real git repo.
    Returns (is_valid, error_message).
    """
    if not path:
        return False, "Repository path is empty"

    # Normalize and resolve
    path = os.path.abspath(os.path.normpath(path))

    # Prevent path traversal
    if ".." in path.split(os.sep):
        return False, "Path traversal detected"

    # Check existence
    if not os.path.isdir(path):
        return False, f"Directory does not exist: {path}"

    # Check it's a git repo
    git_dir = os.path.join(path, ".git")
    if not os.path.isdir(git_dir):
        return False, f"Not a git repository (no .git folder): {path}"

    # Block system directories
    system_paths = ["C:\\Windows", "C:\\Program Files", "/usr", "/etc", "/bin"]
    for sp in system_paths:
        if path.lower().startswith(sp.lower()):
            return False, f"Cannot analyze system directory: {path}"

    return True, ""


def validate_json_response(text: str, max_size: int = 10000) -> Optional[dict]:
    """
    Safely parse LLM JSON output with size limits.
    Returns parsed dict or None.
    """
    if not text or len(text) > max_size:
        return None

    # Strip markdown fences
    clean = re.sub(r"^```\w*\n?", "", text.strip()).rstrip("`").strip()

    try:
        result = json.loads(clean)
        if isinstance(result, dict):
            return result
    except json.JSONDecodeError:
        # Try extracting first JSON object
        match = re.search(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", clean)
        if match:
            try:
                result = json.loads(match.group())
                if isinstance(result, dict):
                    return result
            except json.JSONDecodeError:
                pass
    return None


# ─── Layer 2: Pipeline Integrity (HMAC) ──────────────────────────────────────

def _get_integrity_key() -> bytes:
    """Get or generate the HMAC signing key."""
    key_path = os.path.join("data", ".integrity_key")
    if os.path.exists(key_path):
        with open(key_path, "rb") as f:
            return f.read()
    key = os.urandom(32)
    os.makedirs(os.path.dirname(key_path), exist_ok=True)
    with open(key_path, "wb") as f:
        f.write(key)
    return key


def sign_output(data: dict, step: str) -> dict:
    """HMAC-sign pipeline output for tamper detection."""
    data_copy = {k: v for k, v in data.items() if k != "_integrity"}
    content = json.dumps(data_copy, sort_keys=True, default=str)
    signature = hmac.new(
        _get_integrity_key(), content.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    data["_integrity"] = {
        "step": step,
        "signature": signature,
        "timestamp": datetime.now().isoformat(),
    }
    return data


def verify_integrity(data: dict) -> bool:
    """Verify pipeline output hasn't been tampered with."""
    sig_block = data.get("_integrity")
    if not sig_block:
        return False
    data_copy = {k: v for k, v in data.items() if k != "_integrity"}
    content = json.dumps(data_copy, sort_keys=True, default=str)
    expected = hmac.new(
        _get_integrity_key(), content.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(sig_block["signature"], expected)


# ─── Layer 3: Encryption at Rest ─────────────────────────────────────────────

def _get_fernet() -> Fernet:
    """Get or generate Fernet encryption key."""
    key_path = os.path.join("data", ".encryption_key")
    if os.path.exists(key_path):
        with open(key_path, "rb") as f:
            return Fernet(f.read())
    key = Fernet.generate_key()
    os.makedirs(os.path.dirname(key_path), exist_ok=True)
    with open(key_path, "wb") as f:
        f.write(key)
    return Fernet(key)


def encrypt_data(data: dict) -> bytes:
    """Encrypt sensitive data (scored commits, contribution vectors)."""
    fernet = _get_fernet()
    return fernet.encrypt(json.dumps(data, default=str).encode("utf-8"))


def decrypt_data(token: bytes) -> dict:
    """Decrypt sensitive data."""
    fernet = _get_fernet()
    return json.loads(fernet.decrypt(token).decode("utf-8"))


# ─── Layer 4: Audit Trail ────────────────────────────────────────────────────

AUDIT_LOG_PATH = os.path.join("data", ".audit_log.jsonl")


def audit_log(action: str, details: dict = None) -> None:
    """Log every significant action for traceability."""
    details = details or {}
    entry = {
        "timestamp": datetime.now().isoformat(),
        "action": action,
        "model": details.get("model"),
        "input_hash": hashlib.sha256(
            str(details.get("input", "")).encode("utf-8")
        ).hexdigest()[:16],
        "success": details.get("success", True),
        "latency_ms": details.get("latency_ms"),
        "error": details.get("error"),
        "extra": {k: v for k, v in details.items()
                  if k not in ("model", "input", "success", "latency_ms", "error")},
    }
    try:
        os.makedirs(os.path.dirname(AUDIT_LOG_PATH), exist_ok=True)
        with open(AUDIT_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, default=str) + "\n")
    except OSError:
        logger.warning("Failed to write audit log entry")


# ─── Offline Enforcement ─────────────────────────────────────────────────────

def enforce_offline(base_url: str = "http://localhost:11434") -> bool:
    """Verify all Ollama URLs point to localhost only."""
    from urllib.parse import urlparse
    parsed = urlparse(base_url)
    allowed_hosts = {"localhost", "127.0.0.1", "0.0.0.0", "::1"}
    if parsed.hostname not in allowed_hosts:
        logger.error(
            f"⛔ SECURITY: Ollama URL points to non-local host: {parsed.hostname}. "
            f"This system must run 100%% offline."
        )
        return False
    logger.debug(f"✅ Offline enforcement passed: {base_url}")
    return True
