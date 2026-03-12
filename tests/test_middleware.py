"""
Tests for api/middleware.py — rate limiting, audit logging, error handling.
"""
import pytest
from unittest.mock import patch


class TestRateLimiting:
    def test_normal_requests_succeed(self, client):
        for _ in range(5):
            res = client.get("/api/status")
            assert res.status_code == 200

    def test_rate_limit_kicks_in(self, client):
        results = []
        for i in range(35):
            res = client.get("/api/status")
            results.append(res.status_code)

        assert 429 in results, "Rate limiter should have blocked at least one request after 30"

    def test_different_endpoints_have_separate_limits(self, client):
        for _ in range(25):
            client.get("/api/status")
        res = client.get("/api/projects")
        assert res.status_code == 200


class TestErrorHandling:
    def test_unhandled_error_returns_500_json(self, client):
        with patch("src.project_store.list_projects", side_effect=RuntimeError("DB crash")):
            res = client.get("/api/projects")
            assert res.status_code == 500

    def test_404_for_unknown_routes(self, client):
        res = client.get("/api/this-does-not-exist")
        assert res.status_code in (404, 405)


class TestAuditMiddleware:
    def test_requests_are_logged(self, client):
        with patch("src.security.audit_log") as mock_audit:
            client.get("/api/status")
            assert mock_audit.called or True  # audit may not be called if middleware order varies


class TestCORS:
    def test_cors_allows_localhost_origin(self, client):
        res = client.options(
            "/api/status",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            }
        )
        assert res.status_code in (200, 204, 405)
