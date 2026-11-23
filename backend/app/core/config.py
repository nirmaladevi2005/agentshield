from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Any
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "AgentShield"
    TAGLINE: str = "Let AI Agents Act. Make Every Action Safe."
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Database: Defaults to SQLite for local zero-config, supports PostgreSQL via DATABASE_URL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./agentshield.db")
    
    # Gemini AI configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    # Security & Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "agentshield_secure_super_secret_key_change_in_prod_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        env = os.getenv("ENVIRONMENT", "development").lower()
        if env == "production":
            default_key = "agentshield_secure_super_secret_key_change_in_prod_2026"
            if not v or v == default_key or len(v) < 32:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: In production, SECRET_KEY must be "
                    "configured with a cryptographically secure random string of at least 32 characters."
                )
        return v
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://agentshield-five-inky.vercel.app",
        "https://agentshield.vercel.app"
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> Any:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    FRONTEND_URL: str = "http://localhost:5173"

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"
    }

settings = Settings()
