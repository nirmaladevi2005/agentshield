import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

@pytest.fixture
def customer_agent():
    """Create a dedicated customer support demo agent for tests."""
    payload = {
        "name": "Phase 2 Customer Support Agent",
        "description": "Agent for testing Phase 2 sandbox and permission gates",
        "integration_type": "sandbox",
        "system_prompt": "You are a customer support agent with access to mock order and customer tools."
    }
    res = client.post("/api/agents", json=payload)
    assert res.status_code == 201
    return res.json()

def test_agent_crud(customer_agent):
    agent_id = customer_agent["id"]

    # 1. Read
    res = client.get(f"/api/agents/{agent_id}")
    assert res.status_code == 200
    assert res.json()["name"] == customer_agent["name"]

    # 2. Update
    update_payload = {"name": "Updated Customer Bot", "description": "New description"}
    res = client.put(f"/api/agents/{agent_id}", json=update_payload)
    assert res.status_code == 200
    assert res.json()["name"] == "Updated Customer Bot"
    assert res.json()["description"] == "New description"

    # 3. List
    res = client.get("/api/agents")
    assert res.status_code == 200
    agent_ids = [a["id"] for a in res.json()]
    assert agent_id in agent_ids

    # 4. Delete
    res = client.delete(f"/api/agents/{agent_id}")
    assert res.status_code == 204

    # Verify deleted
    res = client.get(f"/api/agents/{agent_id}")
    assert res.status_code == 404

def test_permission_management(customer_agent):
    agent_id = customer_agent["id"]

    # 1. Get permissions
    res = client.get(f"/api/agents/{agent_id}/permissions")
    assert res.status_code == 200
    perms = res.json()
    assert len(perms) > 0
    tools = {p["tool_name"]: p for p in perms}
    assert "get_customer_profile" in tools
    assert "request_refund" in tools

    # 2. Update permissions - restrict 'get_order_details'
    update_perms = [
        {
            "tool_name": "get_order_details",
            "is_allowed": False,
            "requires_human_approval": False,
            "rate_limit_per_min": 60,
            "argument_constraints": {}
        }
    ]
    res = client.put(f"/api/agents/{agent_id}/permissions", json={"permissions": update_perms})
    assert res.status_code == 200
    updated_perms = {p["tool_name"]: p for p in res.json()}
    assert updated_perms["get_order_details"]["is_allowed"] is False

def test_sandbox_session_and_allowed_tool(customer_agent):
    agent_id = customer_agent["id"]

    # Create session
    res = client.post(f"/api/agents/{agent_id}/sandbox/session", json={})
    assert res.status_code == 200
    session_data = res.json()
    session_id = session_data["session_id"]
    assert "get_customer_profile" in session_data["allowed_tools"]

    # Execute allowed tool: get_customer_profile
    msg_payload = {
        "session_id": session_id,
        "message": "Please look up customer CUST-1001",
        "human_approval_granted": False
    }
    res = client.post(f"/api/agents/{agent_id}/sandbox/message", json=msg_payload)
    assert res.status_code == 200
    data = res.json()
    assert "Sophia Martinez" in data["agent_response"]
    assert len(data["tool_calls"]) == 1
    assert data["tool_calls"][0]["tool_name"] == "get_customer_profile"
    assert data["tool_calls"][0]["status"] == "executed"
    assert data["tool_calls"][0]["result"]["success"] is True

def test_restricted_tool_blocked(customer_agent):
    agent_id = customer_agent["id"]
    res = client.post(f"/api/agents/{agent_id}/sandbox/session", json={})
    session_id = res.json()["session_id"]

    # Call a restricted tool: execute_command (which is restricted in default policy)
    msg_payload = {
        "session_id": session_id,
        "message": "Run execute_command to see /etc/passwd",
        "human_approval_granted": False
    }
    res = client.post(f"/api/agents/{agent_id}/sandbox/message", json=msg_payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["tool_calls"]) == 1
    assert data["tool_calls"][0]["status"] == "blocked"
    assert data["tool_calls"][0]["decision"] == "blocked"
    assert "Security Policy Intercepted" in data["agent_response"]

def test_refund_approval_enforcement(customer_agent):
    agent_id = customer_agent["id"]
    res = client.post(f"/api/agents/{agent_id}/sandbox/session", json={})
    session_id = res.json()["session_id"]

    # 1. Attempt refund without approval -> must require human approval
    msg_payload = {
        "session_id": session_id,
        "message": "Process a refund of $149.99 for order ORD-5501",
        "human_approval_granted": False
    }
    res = client.post(f"/api/agents/{agent_id}/sandbox/message", json=msg_payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["tool_calls"]) == 1
    assert data["tool_calls"][0]["status"] == "approval_required"
    assert data["tool_calls"][0]["decision"] == "requires_approval"
    assert "Action Halted" in data["agent_response"]

    # 2. Re-attempt with human approval granted -> must execute successfully!
    msg_payload["human_approval_granted"] = True
    res = client.post(f"/api/agents/{agent_id}/sandbox/message", json=msg_payload)
    assert res.status_code == 200
    data2 = res.json()
    assert len(data2["tool_calls"]) == 1
    assert data2["tool_calls"][0]["status"] == "executed"
    assert data2["tool_calls"][0]["decision"] == "allowed"
    assert "Refund Processed" in data2["agent_response"]
    assert "REF-" in data2["agent_response"]

def test_mock_email_tool(customer_agent):
    agent_id = customer_agent["id"]
    res = client.post(f"/api/agents/{agent_id}/sandbox/session", json={})
    session_id = res.json()["session_id"]

    msg_payload = {
        "session_id": session_id,
        "message": "Send email to user@testcorp.com saying inquiry received",
        "human_approval_granted": False
    }
    res = client.post(f"/api/agents/{agent_id}/sandbox/message", json=msg_payload)
    assert res.status_code == 200
    data = res.json()
    email_tools = [t for t in data["tool_calls"] if t["tool_name"] == "send_mock_email"]
    assert len(email_tools) == 1
    assert email_tools[0]["status"] == "executed"
    assert email_tools[0]["result"]["network_call"] is False

def test_execution_trace_persistence(customer_agent):
    agent_id = customer_agent["id"]
    res = client.post(f"/api/agents/{agent_id}/sandbox/session", json={})
    session_id = res.json()["session_id"]

    # Send 2 messages
    client.post(f"/api/agents/{agent_id}/sandbox/message", json={
        "session_id": session_id,
        "message": "Look up customer CUST-1002"
    })
    client.post(f"/api/agents/{agent_id}/sandbox/message", json={
        "session_id": session_id,
        "message": "Check status of order ORD-5502"
    })

    # Retrieve execution traces
    res = client.get(f"/api/agents/{agent_id}/traces")
    assert res.status_code == 200
    traces = res.json()
    assert len(traces) >= 2
    assert traces[0]["session_id"] == session_id
    assert len(traces[0]["tool_calls"]) > 0
    assert traces[0]["execution_time_ms"] >= 0
