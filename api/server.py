"""
server.py — FastAPI application entry point.
Mounts routes, middleware, and CORS. Run with: uvicorn api.server:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router
from api.auth import router as auth_router
from api.middleware import RateLimitMiddleware, AuditMiddleware, ErrorHandlerMiddleware

app = FastAPI(
    title="AI Git Contribution Analyzer",
    description="AI-powered peer feedback coach for STEM hackathon projects",
    version="1.0.0",
)

# ─── CORS (localhost only) ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8501", "http://127.0.0.1:8501",
                    "http://localhost:3000", "http://127.0.0.1:3000",
                    "http://localhost:5173", "http://127.0.0.1:5173",
                    "http://localhost:5174", "http://127.0.0.1:5174",
                    "http://localhost:5175", "http://127.0.0.1:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Custom Middleware Stack ──────────────────────────────────────────────────
app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(AuditMiddleware)
app.add_middleware(RateLimitMiddleware, max_requests=30, window_seconds=60)

# ─── Routes ───────────────────────────────────────────────────────────────────
app.include_router(router)
app.include_router(auth_router)


@app.get("/")
async def root():
    return {
        "name": "AI Git Contribution Analyzer",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": [
            "POST /api/analyze",
            "GET /api/status",
            "GET /api/results",
            "GET /api/results/{email}",
            "GET /api/commits",
            "POST /api/query",
            "GET /api/export/pdf/{email}",
            "GET /api/export/pdf/team",
            "GET /api/rubric",
            "PUT /api/rubric",
            "GET /api/audit",
        ],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
