from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from backend.app.core.database import get_db
from backend.app.models.user import User

security_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    # 1. Check if token is provided
    if credentials:
        token = credentials.credentials
        # In full production Firebase mode, verify Firebase ID token here.
        # If valid, look up user by firebase_uid or email.
        user = db.query(User).filter(User.firebase_uid == token).first()
        if user:
            return user

    # 2. Seamless Local Developer / MVP fallback: Return the primary authenticated demo user
    user = db.query(User).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authenticated user found. Please initialize the database."
        )
    return user
