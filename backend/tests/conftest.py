import pytest
from backend.app.main import app
from backend.app.core.security import get_current_user
from backend.app.core.database import SessionLocal
from backend.app.models.user import User


@pytest.fixture(autouse=True, scope="session")
def setup_auth_override_session():
    """
    Session-wide fixture providing authenticated context for all legacy test suites
    (Phases 1 through 6).
    """
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "demo@agentshield.ai").first()
        if user:
            app.dependency_overrides[get_current_user] = lambda: user
            yield
            app.dependency_overrides.pop(get_current_user, None)
        else:
            yield
    finally:
        db.close()
