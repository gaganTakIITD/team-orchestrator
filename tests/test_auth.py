"""
Tests for api/auth.py — JWT token handling, /me endpoint, /logout, token validation.
"""
import pytest
import jwt
from datetime import datetime, timedelta
from unittest.mock import patch
from tests.conftest import make_test_token, make_expired_token, TEST_JWT_SECRET, TEST_JWT_ALGORITHM


class TestAuthMe:
    def test_me_without_cookie_returns_401(self, client):
        res = client.get("/api/auth/me")
        assert res.status_code == 401
        assert "Not authenticated" in res.json()["detail"]

    def test_me_with_valid_token(self, auth_client):
        res = auth_client.get("/api/auth/me")
        assert res.status_code == 200
        data = res.json()
        assert data["email"] == "alice@test.com"
        assert data["name"] == "Alice"
        assert data["login"] == "alice"
        assert "github_token" not in data

    def test_me_with_expired_token(self, client):
        token = make_expired_token()
        client.cookies.set("auth_token", token)
        res = client.get("/api/auth/me")
        assert res.status_code == 401
        assert "expired" in res.json()["detail"].lower()

    def test_me_with_invalid_token(self, client):
        client.cookies.set("auth_token", "not-a-real-jwt-token")
        res = client.get("/api/auth/me")
        assert res.status_code == 401

    def test_me_strips_github_token_from_response(self, auth_client):
        res = auth_client.get("/api/auth/me")
        data = res.json()
        assert "github_token" not in data

    def test_me_returns_avatar_url(self, auth_client):
        res = auth_client.get("/api/auth/me")
        data = res.json()
        assert "avatar_url" in data


class TestAuthLogout:
    def test_logout_returns_success(self, client):
        res = client.post("/api/auth/logout")
        assert res.status_code == 200
        assert res.json()["message"] == "Logged out successfully"

    def test_logout_clears_cookie(self, auth_client):
        res = auth_client.post("/api/auth/logout")
        assert res.status_code == 200


class TestAuthGithubLogin:
    def test_github_login_redirects(self, client):
        with patch("api.auth.GITHUB_CLIENT_ID", "test-client-id"):
            res = client.get("/api/auth/github/login", follow_redirects=False)
            assert res.status_code in (307, 302)
            assert "github.com/login/oauth" in res.headers.get("location", "")

    def test_github_login_fails_without_client_id(self, client):
        with patch("api.auth.GITHUB_CLIENT_ID", ""):
            res = client.get("/api/auth/github/login")
            assert res.status_code == 500


class TestTokenCreation:
    def test_create_access_token_is_valid(self):
        from api.auth import create_access_token
        with patch("api.auth.JWT_SECRET", TEST_JWT_SECRET):
            token = create_access_token({"email": "test@test.com", "name": "Test"})
            decoded = jwt.decode(token, TEST_JWT_SECRET, algorithms=[TEST_JWT_ALGORITHM])
            assert decoded["email"] == "test@test.com"
            assert "exp" in decoded

    def test_token_has_correct_expiry(self):
        from api.auth import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
        with patch("api.auth.JWT_SECRET", TEST_JWT_SECRET):
            token = create_access_token({"email": "test@test.com"})
            decoded = jwt.decode(token, TEST_JWT_SECRET, algorithms=[TEST_JWT_ALGORITHM])
            exp = datetime.utcfromtimestamp(decoded["exp"])
            assert exp > datetime.utcnow()
            assert exp < datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES + 5)
