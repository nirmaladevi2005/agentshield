import uuid
import re
import time
from datetime import datetime
from typing import Optional
from collections import defaultdict
from threading import Lock
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import (
    get_current_user,
    get_password_hash,
    verify_password,
    create_access_token,
)
from backend.app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

EMAIL_REGEX = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

# In-memory sliding window rate limiter
_rate_limit_lock = Lock()
_login_attempts = defaultdict(list)
_register_attempts = defaultdict(list)


def check_rate_limit(attempts_dict: dict, client_ip: str, max_attempts: int, window_seconds: int = 60) -> bool:
    """Sliding-window thread-safe rate limiter."""
    now = time.time()
    with _rate_limit_lock:
        timestamps = attempts_dict[client_ip]
        attempts_dict[client_ip] = [t for t in timestamps if now - t < window_seconds]
        if len(attempts_dict[client_ip]) >= max_attempts:
            return False
        attempts_dict[client_ip].append(now)
        return True


def clear_rate_limits():
    """Helper for testing environments."""
    with _rate_limit_lock:
        _login_attempts.clear()
        _register_attempts.clear()


class UserProfileResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    role: str
    firebase_uid: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileResponse


class UserRegisterRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=12, max_length=72, description="Password (at least 12 characters, maximum 72 bytes)")
    name: Optional[str] = Field(None, description="Full name or display handle")
    role: Optional[str] = Field("developer", description="Role: developer, secops, or auditor")


class UserLoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="Account password")


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: UserRegisterRequest, request: Request, db: Session = Depends(get_db)):
    """Register a new user account, hash the password, and return a JWT access token."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    if not check_rate_limit(_register_attempts, client_ip, max_attempts=10, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts. Please try again after 60 seconds.",
        )

    email_clean = req.email.strip().lower()

    if not re.match(EMAIL_REGEX, email_clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format.",
        )

    pwd_bytes = req.password.encode("utf-8")
    if len(pwd_bytes) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password cannot exceed 72 bytes.",
        )

    # Check uniqueness
    existing_user = db.query(User).filter(User.email == email_clean).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # Enforce privilege boundary: Self-registration strictly allows only unprivileged roles
    allowed_self_roles = {"developer", "secops", "auditor"}
    user_role = req.role if req.role in allowed_self_roles else "developer"

    try:
        hashed = get_password_hash(req.password)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

    user_id = str(uuid.uuid4())
    display_name = (req.name or email_clean.split("@")[0]).strip()

    new_user = User(
        id=user_id,
        email=email_clean,
        name=display_name,
        hashed_password=hashed,
        role=user_role,
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": new_user.id, "email": new_user.email, "role": new_user.role})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserProfileResponse(
            id=new_user.id,
            email=new_user.email,
            name=new_user.name,
            role=new_user.role,
            firebase_uid=new_user.firebase_uid,
        ),
    )


@router.post("/login", response_model=TokenResponse)
def login(req: UserLoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticate with email and password, returning a signed JWT access token."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    if not check_rate_limit(_login_attempts, client_ip, max_attempts=15, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please try again after 60 seconds.",
        )

    email_clean = req.email.strip().lower()

    # Rejection of passwords exceeding 72 bytes
    if len(req.password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact an administrator.",
        )

    token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserProfileResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            firebase_uid=user.firebase_uid,
        ),
    )


@router.get("/me", response_model=UserProfileResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Return the profile of the currently authenticated user."""
    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        firebase_uid=current_user.firebase_uid,
    )
