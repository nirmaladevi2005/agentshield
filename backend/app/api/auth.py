from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from backend.app.core.security import get_current_user
from backend.app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UserProfileResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    role: str
    firebase_uid: Optional[str] = None

@router.get("/me", response_model=UserProfileResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        firebase_uid=current_user.firebase_uid
    )
