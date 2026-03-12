import os
import httpx
import jwt
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Response, Request, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from src.utils import get_logger

logger = get_logger("api.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Environment variables for GitHub OAuth
GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "") # Need to set this in env
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "") # Need to set this in env
JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

# Determine the frontend URL (for redirection after login)
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


@router.get("/github/login")
async def github_login():
    """Redirects the user to GitHub's OAuth authorization page."""
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GITHUB_CLIENT_ID not configured on server")
    
    auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&scope=read:user user:email repo"
        f"&prompt=consent"
    )
    return RedirectResponse(auth_url)


@router.get("/github/callback")
async def github_callback(code: str, response: Response):
    """Handles the GitHub OAuth callback, exchanging the code for an access token,
    fetching user data, and setting a JWT cookie."""
    if not code:
        raise HTTPException(status_code=400, detail="No code provided")

    # 1. Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
            },
        )
        token_data = token_res.json()
        
        if "error" in token_data:
            logger.error(f"GitHub OAuth Error: {token_data.get('error_description')}")
            # Redirect to login with error
            return RedirectResponse(f"{FRONTEND_URL}/login?error=oauth_failed")
            
        access_token = token_data.get("access_token")
        
        # 2. Fetch user profile
        user_res = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json",
            }
        )
        user_data = user_res.json()

        # 3. Fetch user emails (since primary email might not be in profile data)
        emails_res = await client.get(
            "https://api.github.com/user/emails",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json",
            }
        )
        emails_data = emails_res.json()
        
        # Find primary email
        primary_email = None
        for email_obj in emails_data:
            if email_obj.get("primary"):
                primary_email = email_obj.get("email")
                break
        
        if not primary_email and len(emails_data) > 0:
            primary_email = emails_data[0].get("email")

    if not primary_email:
         return RedirectResponse(f"{FRONTEND_URL}/login?error=no_email")

    # 4. Create JWT token
    jwt_data = {
        "sub": str(user_data.get("id")),
        "login": user_data.get("login"),
        "name": user_data.get("name") or user_data.get("login"),
        "email": primary_email,
        "avatar_url": user_data.get("avatar_url"),
        "github_token": access_token,
    }
    
    token = create_access_token(jwt_data)
    
    # 5. Redirect back to frontend with the token securely in an HTTP-only cookie
    # (Using a standard cookie here rather than secure/httponly for ease of local dev; 
    # adjust for production!)
    redirect = RedirectResponse(f"{FRONTEND_URL}/dashboard")
    redirect.set_cookie(
        key="auth_token",
        value=token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,  # Secure against XSS
        samesite="lax", # Allow cross-site redirects (needed for OAuth callback)
        secure=False,   # Set True in production with HTTPS
    )
    
    return redirect

@router.get("/me")
async def get_current_user(request: Request):
    """Returns the currently authenticated user based on the cookie. Drops the secret github_token from the public response."""
    token = request.cookies.get("auth_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        # NEVER send github_token back to client!
        payload.pop("github_token", None)
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/github/repos")
async def get_github_repos(request: Request):
    """Fetches the actual remote repositories for the logged in user via GitHub API."""
    token = request.cookies.get("auth_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        github_token = payload.get("github_token")
        if not github_token:
            raise HTTPException(status_code=401, detail="No GitHub access token in session")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://api.github.com/user/repos?per_page=100&sort=updated",
            headers={
                "Authorization": f"Bearer {github_token}",
                "Accept": "application/vnd.github.v3+json",
            }
        )
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail="Failed to fetch repos from GitHub")
        
        repos = []
        for r in res.json():
            repos.append({
                "id": str(r["id"]),
                "name": r["name"],
                "full_name": r["full_name"],
                "private": r["private"],
                "html_url": r["html_url"],
                "description": r["description"],
                "owner_login": r.get("owner", {}).get("login"),
                "owner_avatar": r.get("owner", {}).get("avatar_url"),
            })
        return {"repos": repos}

@router.post("/logout")
async def logout(response: Response):
    """Clears the authentication cookie."""
    response.delete_cookie(key="auth_token", httponly=True, samesite="lax")
    return {"message": "Logged out successfully"}
