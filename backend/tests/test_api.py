import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_dashboard_stats():
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    assert data["kpis"]["total_agents"] >= 1
    assert "vulnerability_distribution" in data
    assert "block_vs_success" in data

def test_list_agents():
    response = client.get("/api/agents")
    assert response.status_code == 200
    agents = response.json()
    assert isinstance(agents, list)
    assert len(agents) >= 1
    assert "name" in agents[0]

def test_list_scenarios():
    response = client.get("/api/scenarios")
    assert response.status_code == 200
    scenarios = response.json()
    assert isinstance(scenarios, list)
    assert len(scenarios) >= 4
    categories = {s["category"] for s in scenarios}
    assert "prompt_injection" in categories
    assert "unauthorized_tool_usage" in categories
    assert "sensitive_data_exposure" in categories
    assert "excessive_agency" in categories

def test_create_agent():
    new_agent = {
        "name": "Test Security Evaluator Agent",
        "description": "Agent for automated security regression validation",
        "integration_type": "sandbox",
        "system_prompt": "You are a secure assistant with restricted permissions."
    }
    response = client.post("/api/agents", json=new_agent)
    assert response.status_code == 201
    created = response.json()
    assert created["name"] == new_agent["name"]
    assert "id" in created
    assert len(created["permissions"]) > 0
