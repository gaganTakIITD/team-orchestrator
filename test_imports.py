"""Quick import + sanity test."""
import sys, traceback
print(f"Python: {sys.executable}")

errors = []
for mod in ["git", "langchain_core", "langchain_ollama", "llama_index.core",
            "pandas", "streamlit", "plotly", "fastapi", "uvicorn",
            "pydantic", "cryptography", "llama_index.llms.ollama",
            "llama_index.embeddings.ollama"]:
    try:
        __import__(mod)
        print(f"  OK  {mod}")
    except Exception as e:
        print(f"  FAIL {mod}: {e}")
        traceback.print_exc()
        errors.append(mod)

# Test our own modules
sys.path.insert(0, ".")
for mod in ["src.utils", "src.security", "src.extractor", "src.preprocessor",
            "src.analyzer", "src.aggregator", "src.feedback_coach",
            "src.report_generator", "api.schemas", "api.middleware"]:
    try:
        __import__(mod)
        print(f"  OK  {mod}")
    except Exception as e:
        print(f"  FAIL {mod}: {e}")
        traceback.print_exc()
        errors.append(mod)

if errors:
    print(f"\nFAILED: {errors}")
    sys.exit(1)
else:
    print("\nALL IMPORTS PASSED")
