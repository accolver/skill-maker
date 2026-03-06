# app/main.py - FastAPI blog API with JWT auth, rate limiting, and pagination
from fastapi import FastAPI, Depends, HTTPException, Query, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import jwt

app = FastAPI(title="Blog API", version="2.0.0")
security = HTTPBearer(auto_error=False)

# --- Rate Limiting ---
# Middleware: 100 req/min for authenticated, 20 req/min for anonymous
# Returns 429 with Retry-After header when exceeded

RATE_LIMITS = {
    "authenticated": {"requests": 100, "window_seconds": 60},
    "anonymous": {"requests": 20, "window_seconds": 60},
}

# --- Auth ---
SECRET_KEY = "your-secret-key"

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract and validate JWT token. Returns user dict or None for public endpoints."""
    if credentials is None:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        return {"id": payload["sub"], "email": payload["email"], "role": payload.get("role", "reader")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

def require_auth(user=Depends(get_current_user)):
    """Require authentication - raises 401 if no valid token."""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

def require_role(required_role: str):
    """Require specific role - raises 403 if insufficient permissions."""
    def check(user=Depends(require_auth)):
        if user["role"] not in [required_role, "admin"]:
            raise HTTPException(status_code=403, detail=f"Requires {required_role} role or higher")
        return user
    return check

# --- Models ---
class PostCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=200, description="Post title")
    content: str = Field(..., min_length=20, description="Post content in Markdown")
    tags: List[str] = Field(default=[], max_length=10, description="Up to 10 tags")
    published: bool = Field(default=False, description="Whether to publish immediately")

class PostUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    content: Optional[str] = Field(None, min_length=20)
    tags: Optional[List[str]] = Field(None, max_length=10)
    published: Optional[bool] = None

class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000, description="Comment text")
    parent_id: Optional[str] = Field(None, description="Parent comment ID for replies")

class PostResponse(BaseModel):
    id: str
    title: str
    content: str
    tags: List[str]
    published: bool
    author_id: str
    author_name: str
    created_at: datetime
    updated_at: datetime
    comment_count: int

class PaginatedResponse(BaseModel):
    items: List[PostResponse]
    total: int
    page: int
    per_page: int
    has_more: bool

# --- Blog Post Endpoints ---

@app.get("/api/posts", response_model=PaginatedResponse)
async def list_posts(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    author_id: Optional[str] = Query(None, description="Filter by author"),
    published_only: bool = Query(True, description="Only show published posts"),
    user=Depends(get_current_user),
):
    """List blog posts with pagination. Public endpoint - no auth required.
    Authenticated users can see their own unpublished drafts."""
    # ... implementation
    pass

@app.get("/api/posts/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: str,
    user=Depends(get_current_user),
):
    """Get a single blog post by ID. Public for published posts.
    Authors can view their own unpublished drafts."""
    # ... implementation - raises 404 if not found
    pass

@app.post("/api/posts", response_model=PostResponse, status_code=201)
async def create_post(
    post: PostCreate,
    user=Depends(require_auth),
):
    """Create a new blog post. Requires authentication."""
    # ... implementation
    pass

@app.put("/api/posts/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: str,
    post: PostUpdate,
    user=Depends(require_auth),
):
    """Update an existing blog post. Only the author or admin can update.
    Raises 403 if not the author, 404 if not found."""
    # ... implementation
    pass

@app.delete("/api/posts/{post_id}", status_code=204)
async def delete_post(
    post_id: str,
    user=Depends(require_auth),
):
    """Delete a blog post. Only the author or admin can delete.
    Raises 403 if not the author, 404 if not found."""
    # ... implementation
    pass

# --- Comment Endpoints ---

@app.get("/api/posts/{post_id}/comments")
async def list_comments(
    post_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    """List comments for a post. Public endpoint, no auth required.
    Returns nested comment threads."""
    # ... implementation - raises 404 if post not found
    pass

@app.post("/api/posts/{post_id}/comments", status_code=201)
async def create_comment(
    post_id: str,
    comment: CommentCreate,
    user=Depends(require_auth),
):
    """Add a comment to a post. Requires authentication.
    Raises 404 if post not found, 404 if parent_id doesn't exist."""
    # ... implementation
    pass

@app.delete("/api/posts/{post_id}/comments/{comment_id}", status_code=204)
async def delete_comment(
    post_id: str,
    comment_id: str,
    user=Depends(require_role("moderator")),
):
    """Delete a comment. Requires moderator role or higher.
    Raises 404 if comment not found."""
    # ... implementation
    pass
