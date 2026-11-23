import uuid
from datetime import timedelta
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.security import get_current_user, create_access_token
from backend.app.core.database import SessionLocal
from backend.app.models.user import User
from backend.app.api.auth import clear_rate_limits

client = TestClient(app)


@pytest.fixture(autouse=True)
def enforce_real_auth():
    """
    Ensure test_auth strictly tests production authentication logic by removing
    any session dependency overrides during these tests, then restoring afterwards.
    """
    clear_rate_limits()
    app.dependency_overrides.pop(get_current_user, None)
    yield
    # Restore override for other test suites that may run afterwards
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "demo@agentshield.ai").first()
        if user:
            app.dependency_overrides[get_current_user] = lambda: user
    finally:
        db.close()


def test_auth_registration_success():
    """Test registering a brand new user."""
    unique_email = f"sec_user_{uuid.uuid4().hex[:8]}@testorg.com"
    payload = {
        "email": unique_email,
        "password": "StrongSecurityPassword123!",
        "name": "Jane Doe",
        "role": "secops"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == unique_email
    assert data["user"]["role"] == "secops"
    assert "id" in data["user"]


def test_auth_registration_duplicate_email():
    """Test that duplicate registration attempts are rejected with 400."""
    unique_email = f"dup_user_{uuid.uuid4().hex[:8]}@testorg.com"
    payload = {
        "email": unique_email,
        "password": "StrongSecurityPassword123!",
        "name": "First Register"
    }
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"].lower()


def test_auth_registration_invalid_email():
    """Test registration with invalid email format."""
    payload = {
        "email": "not-an-email",
        "password": "StrongSecurityPassword123!",
        "name": "Invalid"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 400


def test_auth_registration_short_password():
    """Test registration with a password shorter than 12 characters."""
    payload = {
        "email": f"short_pwd_{uuid.uuid4().hex[:8]}@testorg.com",
        "password": "Short123!",  # 9 chars < 12
        "name": "Short Pwd"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 422


def test_auth_registration_oversized_password():
    """Test registration with password exceeding bcrypt 72-byte limit."""
    payload = {
        "email": f"oversized_pwd_{uuid.uuid4().hex[:8]}@testorg.com",
        "password": "A" * 73,
        "name": "Oversized Pwd"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code in (400, 422)


def test_auth_registration_privilege_escalation_blocked():
    """Test that public self-registration cannot assign 'admin' or 'lead_secops'."""
    payload = {
        "email": f"priv_esc_{uuid.uuid4().hex[:8]}@testorg.com",
        "password": "StrongSecurityPassword123!",
        "name": "Attacker",
        "role": "admin"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    assert response.json()["user"]["role"] == "developer"


def test_auth_login_success():
    """Test logging in with valid registered credentials."""
    email = f"login_test_{uuid.uuid4().hex[:8]}@testorg.com"
    password = "MySecurePassword2026!"
    reg_res = client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "name": "Login Tester"
    })
    assert reg_res.status_code == 201

    login_res = client.post("/api/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert data["user"]["email"] == email


def test_auth_login_wrong_password():
    """Test login failure on incorrect password."""
    email = f"wrong_pwd_{uuid.uuid4().hex[:8]}@testorg.com"
    reg_res = client.post("/api/auth/register", json={
        "email": email,
        "password": "CorrectPassword123!"
    })
    assert reg_res.status_code == 201

    response = client.post("/api/auth/login", json={
        "email": email,
        "password": "WrongPassword999!"
    })
    assert response.status_code == 401
    assert "invalid email or password" in response.json()["detail"].lower()


def test_auth_login_nonexistent_user():
    """Test login failure for an unregistered email."""
    response = client.post("/api/auth/login", json={
        "email": f"nonexistent_{uuid.uuid4().hex[:8]}@testorg.com",
        "password": "SomePassword123!"
    })
    assert response.status_code == 401


def test_auth_me_with_valid_token():
    """Test /api/auth/me returns current user identity with valid Bearer token."""
    email = f"me_test_{uuid.uuid4().hex[:8]}@testorg.com"
    reg_res = client.post("/api/auth/register", json={
        "email": email,
        "password": "MePassword123456!",
        "role": "auditor"
    })
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == email
    assert data["role"] == "auditor"


def test_protected_endpoint_without_token():
    """Test that protected endpoints reject unauthenticated requests with 401."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_protected_endpoint_with_invalid_token():
    """Test that protected endpoints reject bogus Bearer tokens with 401."""
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer totally_fake_token_123"})
    assert response.status_code == 401


def test_protected_endpoint_with_expired_token():
    """Test that expired JWT tokens are rejected with 401."""
    expired_token = create_access_token(
        data={"sub": "some-test-user-id"},
        expires_delta=timedelta(seconds=-10)
    )
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


def test_cross_tenant_isolation_via_jwt():
    """Test that users cannot access resources belonging to other tenants."""
    uid = uuid.uuid4().hex[:6]
    # 1. Register Tenant A
    res_a = client.post("/api/auth/register", json={
        "email": f"tenant_a_{uid}@company.com",
        "password": "TenantAPassword123!",
        "name": "Tenant A Admin"
    })
    assert res_a.status_code == 201
    token_a = res_a.json()["access_token"]

    # 2. Register Tenant B
    res_b = client.post("/api/auth/register", json={
        "email": f"tenant_b_{uid}@company.com",
        "password": "TenantBPassword123!",
        "name": "Tenant B Admin"
    })
    assert res_b.status_code == 201
    token_b = res_b.json()["access_token"]

    # 3. Tenant A creates an agent
    create_res = client.post(
        "/api/agents",
        json={
            "name": f"Tenant A Secret Bot {uid}",
            "description": "Confidential bot for Tenant A",
            "integration_type": "sandbox",
            "system_prompt": "You are a private agent."
        },
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert create_res.status_code == 201
    agent_a_id = create_res.json()["id"]

    # 4. Tenant B lists agents -> should NOT contain agent_a_id
    list_b = client.get("/api/agents", headers={"Authorization": f"Bearer {token_b}"})
    assert list_b.status_code == 200
    b_agent_ids = [ag["id"] for ag in list_b.json()]
    assert agent_a_id not in b_agent_ids

    # 5. Tenant B attempts to fetch Tenant A's agent directly -> should get 404
    get_b = client.get(f"/api/agents/{agent_a_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert get_b.status_code == 404


def test_platform_settings_role_authorization():
    """Test that unprivileged tenants cannot modify platform AI settings."""
    uid = uuid.uuid4().hex[:6]
    res = client.post("/api/auth/register", json={
        "email": f"developer_{uid}@company.com",
        "password": "DevPassword12345!",
        "role": "developer"
    })
    token = res.json()["access_token"]
    update_res = client.post(
        "/api/settings/gemini",
        json={"api_key": "malicious_override_key"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert update_res.status_code == 403
    assert "administrative privileges required" in update_res.json()["detail"].lower()
