"""
indexer.py — LlamaIndex Vector Search.
Converts scored commits into searchable Documents, builds a VectorStoreIndex
using nomic-embed-text via Ollama, and provides natural-language query interface.
"""

import os
import json
from typing import Optional

from llama_index.core import VectorStoreIndex, Document, Settings, StorageContext, load_index_from_storage
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.ollama import OllamaEmbedding

from src.utils import get_logger, load_json
from src.security import audit_log, enforce_offline

logger = get_logger("indexer")

OLLAMA_BASE_URL = "http://localhost:11434"
INDEX_DIR = "data/commit_index"


def _format_document_text(data: dict) -> str:
    """Format a scored commit as searchable text."""
    scores = data.get("llm_scores", {})
    author = data.get("author", {})
    message = data.get("message", {})
    changes = data.get("changes", {})
    coaching = data.get("coaching_feedback", {})

    filenames = [f["filename"] for f in changes.get("files_changed", [])]

    parts = [
        f"Commit {data.get('short_hash', '???')} by {author.get('name', 'Unknown')} <{author.get('email', '')}>",
        f"Date: {data.get('timestamps', {}).get('authored_date', 'unknown')}",
        f"Message: {message.get('subject', '')}",
    ]
    if message.get("body"):
        parts.append(f"Body: {message['body'][:300]}")

    parts.extend([
        f"Type: {scores.get('type', 'unknown')}",
        f"Complexity: {scores.get('complexity', 0)}/5",
        f"Integrity: {scores.get('integrity', 0)}/5",
        f"Impact: {scores.get('impact', 0)}/5",
        f"Files: {', '.join(filenames[:10])}",
        f"Lines added: {changes.get('lines_added', 0)}, deleted: {changes.get('lines_deleted', 0)}",
        f"Languages: {', '.join(data.get('detected_languages', []))}",
        f"Reasoning: {scores.get('reasoning', '')}",
    ])

    if data.get("spam_check", {}).get("is_spam"):
        parts.append(f"SPAM: {data['spam_check'].get('reason', '')}")

    if coaching:
        if coaching.get("strengths"):
            parts.append(f"Strengths: {'; '.join(coaching['strengths'])}")
        if coaching.get("improvements"):
            parts.append(f"Improvements: {'; '.join(coaching['improvements'])}")

    flags = data.get("pre_filter_flags", {})
    active = [k for k, v in flags.items() if v]
    if active:
        parts.append(f"Flags: {', '.join(active)}")

    return "\n".join(parts)


def _build_metadata(data: dict) -> dict:
    """Build metadata dict for a Document."""
    scores = data.get("llm_scores", {})
    return {
        "author_email": data.get("author", {}).get("email", ""),
        "author_name": data.get("author", {}).get("name", ""),
        "type": scores.get("type", "unknown"),
        "complexity": scores.get("complexity", 0),
        "integrity": scores.get("integrity", 0),
        "impact": scores.get("impact", 0),
        "date": data.get("timestamps", {}).get("authored_date", ""),
        "short_hash": data.get("short_hash", ""),
        "is_spam": data.get("spam_check", {}).get("is_spam", False),
    }


def build_index(scored_folder: str, index_dir: str = INDEX_DIR) -> Optional[VectorStoreIndex]:
    """
    Build a VectorStoreIndex from all scored commits.

    Args:
        scored_folder: Path to data/scored_commits/.
        index_dir: Where to persist the index.

    Returns:
        The built VectorStoreIndex, or None on failure.
    """
    if not enforce_offline(OLLAMA_BASE_URL):
        logger.error("  ✗ Offline enforcement failed")
        return None

    # Configure LlamaIndex settings
    try:
        Settings.llm = Ollama(model="llama3.1", base_url=OLLAMA_BASE_URL, request_timeout=120)
        Settings.embed_model = OllamaEmbedding(
            model_name="nomic-embed-text",
            base_url=OLLAMA_BASE_URL,
        )
    except Exception as e:
        logger.error(f"  ✗ Failed to configure LlamaIndex: {e}")
        return None

    # Load scored commits as Documents
    files = sorted(f for f in os.listdir(scored_folder) if f.endswith(".json"))
    if not files:
        logger.warning("  ⚠ No scored commits found")
        return None

    documents = []
    for fname in files:
        try:
            data = load_json(os.path.join(scored_folder, fname))
            doc = Document(
                text=_format_document_text(data),
                metadata=_build_metadata(data),
            )
            documents.append(doc)
        except Exception as e:
            logger.warning(f"  ⚠ Skipping {fname}: {e}")

    if not documents:
        logger.warning("  ⚠ No documents created")
        return None

    # Build index
    try:
        index = VectorStoreIndex.from_documents(documents)
        os.makedirs(index_dir, exist_ok=True)
        index.storage_context.persist(persist_dir=index_dir)
        logger.info(f"  ✓ Indexed {len(documents)} commits")

        audit_log("build_index", {"documents": len(documents), "success": True})
        return index
    except Exception as e:
        logger.error(f"  ✗ Failed to build index: {e}")
        audit_log("build_index", {"success": False, "error": str(e)})
        return None


def load_existing_index(index_dir: str = INDEX_DIR) -> Optional[VectorStoreIndex]:
    """Load a previously persisted index."""
    if not os.path.exists(index_dir):
        return None
    try:
        Settings.llm = Ollama(model="llama3.1", base_url=OLLAMA_BASE_URL, request_timeout=120)
        Settings.embed_model = OllamaEmbedding(
            model_name="nomic-embed-text",
            base_url=OLLAMA_BASE_URL,
        )
        storage_context = StorageContext.from_defaults(persist_dir=index_dir)
        return load_index_from_storage(storage_context)
    except Exception as e:
        logger.warning(f"  ⚠ Could not load index: {e}")
        return None


def query_index(index: VectorStoreIndex, question: str) -> str:
    """
    Query the commit index with a natural language question.

    Examples:
        "What did Riya contribute most?"
        "Which commits were flagged as spam?"
        "Who wrote the most bug fixes?"
    """
    if not index:
        return "Index not available. Run the pipeline first."

    try:
        query_engine = index.as_query_engine(similarity_top_k=5)
        response = query_engine.query(question)
        audit_log("query_index", {"question": question, "success": True})
        return str(response)
    except Exception as e:
        audit_log("query_index", {"question": question, "success": False, "error": str(e)})
        return f"Query failed: {e}"
