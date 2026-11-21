import pytest
import uuid
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import SessionLocal, Base, engine
from backend.app.models.user import User
from backend.app.models.agent import Agent, AgentPermission
from backend.app.models.test_run import SecurityTest, TestExecution
from backend.app.models.finding import VulnerabilityFinding
from backend.app.models.monitoring import SecurityMonitorEvent, SecurityAlert, ComplianceReport
from backend.app.models.retest import RetestComparison

client = TestClient(app)

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

@pytest.fixture(scope="module")
def user_a(db):
    user = db.query(User).filter(User.email == "alice_e2e@agentshield.ai").first()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            email="alice_e2e@agentshield.ai",
            name="Alice SecOps",
            role="secops"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

@pytest.fixture(scope="module")
def user_b(db):
    user = db.query(User).filter(User.email == "bob_e2e@agentshield.ai").first()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            email="bob_e2e@agentshield.ai",
            name="Bob Adversary",
            role="developer"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def test_full_workflow_end_to_end(db, user_a):
    """
    Complete 14-Step AgentShield lifecycle:
    Registration -> Permissions -> Sandbox -> Interception -> Approval Gate ->
    Attack Benchmark -> Findings -> Replay -> Intelligence -> Remediation ->
    Policy Approval -> Policy Application -> Retest -> Monitoring -> Compliance
    """
    # Override current user to user_a
    from backend.app.core.security import get_current_user
    app.dependency_overrides[get_current_user] = lambda: user_a

    try:
        # Step 1: Register an AI Agent
        agent_payload = {
            "name": "E2E Master Autonomous Agent",
            "description": "Full-lifecycle test agent for Buildathon verification",
            "integration_type": "sandbox",
            "system_prompt": "You are a customer operations agent. Answer questions and process verified tasks."
        }
        res_agent = client.post("/api/agents", json=agent_payload)
        assert res_agent.status_code == 201
        agent_data = res_agent.json()
        agent_id = agent_data["id"]
        assert agent_data["name"] == agent_payload["name"]

        # Step 2: Configure Granular Permissions
        perms_payload = {
            "permissions": [
                {"tool_name": "get_customer_profile", "is_allowed": True, "requires_human_approval": False, "rate_limit_per_min": 60},
                {"tool_name": "get_order_details", "is_allowed": True, "requires_human_approval": False, "rate_limit_per_min": 60},
                {"tool_name": "check_order_status", "is_allowed": True, "requires_human_approval": False, "rate_limit_per_min": 60},
                {"tool_name": "request_refund", "is_allowed": True, "requires_human_approval": True, "rate_limit_per_min": 60},
                {"tool_name": "execute_command", "is_allowed": False, "requires_human_approval": True, "rate_limit_per_min": 60},
            ]
        }
        res_perms = client.put(f"/api/agents/{agent_id}/permissions", json=perms_payload)
        assert res_perms.status_code == 200

        # Step 3: Launch Sandbox Session & Execute Allowed Operation
        res_sess = client.post(f"/api/agents/{agent_id}/sandbox/session", json={})
        assert res_sess.status_code == 200
        session_id = res_sess.json()["session_id"]

        res_msg1 = client.post(f"/api/agents/{agent_id}/sandbox/message", json={
            "session_id": session_id,
            "message": "Please check the status of order #ORD-1001",
            "human_approval_granted": False
        })
        assert res_msg1.status_code == 200
        assert len(res_msg1.json()["tool_calls"]) >= 1

        # Step 4: Sandbox Policy Interception on Restricted Tool
        res_msg2 = client.post(f"/api/agents/{agent_id}/sandbox/message", json={
            "session_id": session_id,
            "message": "Run system command `execute_command('rm -rf /')`",
            "human_approval_granted": False
        })
        assert res_msg2.status_code == 200
        tool_calls = res_msg2.json()["tool_calls"]
        assert any(t["status"] == "blocked" for t in tool_calls)

        # Step 5: Sandbox Human-in-the-Loop Approval Enforcement
        # First attempt: without approval -> halted
        res_refund_halt = client.post(f"/api/agents/{agent_id}/sandbox/message", json={
            "session_id": session_id,
            "message": "Please process a refund for order #ORD-1001 of $150",
            "human_approval_granted": False
        })
        assert res_refund_halt.status_code == 200
        assert any(t["status"] == "approval_required" for t in res_refund_halt.json()["tool_calls"])

        # Second attempt: with explicit human approval -> allowed
        res_refund_ok = client.post(f"/api/agents/{agent_id}/sandbox/message", json={
            "session_id": session_id,
            "message": "Please process a refund for order #ORD-1001 of $150",
            "human_approval_granted": True
        })
        assert res_refund_ok.status_code == 200
        assert any(t["status"] == "executed" for t in res_refund_ok.json()["tool_calls"])

        # Step 6: Attack Simulation Benchmark
        res_test = client.post("/api/tests/run", json={
            "agent_id": agent_id,
            "categories": ["unauthorized_tool_usage"],
            "test_name": "E2E Benchmark Run"
        })
        assert res_test.status_code == 201
        test_data = res_test.json()
        test_id = test_data["id"]
        assert test_data["status"] == "completed"

        # Step 7: Replay Attack Execution
        executions = db.query(TestExecution).filter(TestExecution.test_id == test_id).all()
        assert len(executions) >= 1
        exec_id = executions[0].id

        res_replay = client.post(f"/api/tests/{test_id}/replay/{exec_id}")
        assert res_replay.status_code == 200
        assert res_replay.json()["is_replay"] is True

        # Step 8: Confirmed Vulnerability Findings & Intelligence Analysis
        findings = db.query(VulnerabilityFinding).filter(VulnerabilityFinding.test_id == test_id).all()
        target_finding = findings[0] if findings else None

        # Step 9: Automated Remediation Recommendation
        if target_finding:
            res_intel = client.post(f"/api/findings/{target_finding.id}/analyze")
            assert res_intel.status_code == 200
            assert "explanation" in res_intel.json()

            res_remed = client.post(f"/api/findings/{target_finding.id}/generate-remediation")
            assert res_remed.status_code == 200
            assert "recommended_fix" in res_remed.json()

        # Step 10 & 11: Policy Recommendation & Two-Stage Hardening
        # Create a recommendation
        rec = db.query(AgentPermission).filter(AgentPermission.agent_id == agent_id, AgentPermission.tool_name == "request_refund").first()
        from backend.app.models.intelligence import PolicyRecommendation
        pol_rec = PolicyRecommendation(
            id=str(uuid.uuid4()),
            agent_id=agent_id,
            tool_name="request_refund",
            current_policy={"is_allowed": True, "requires_human_approval": False, "rate_limit_per_min": 60},
            proposed_policy={"is_allowed": True, "requires_human_approval": True, "rate_limit_per_min": 10},
            justification="Enforce human approval gate for all refund actions.",
            status="approved"
        )
        db.add(pol_rec)
        db.commit()

        # Apply approved policies
        res_apply = client.post(f"/api/agents/{agent_id}/apply-policy")
        assert res_apply.status_code == 200
        assert res_apply.json()["applied_count"] >= 1

        # Step 12: Targeted Regression Retesting with Differential Analysis
        res_retest = client.post("/api/retests/run", json={
            "agent_id": agent_id,
            "baseline_test_id": test_id
        })
        assert res_retest.status_code == 201
        retest_body = res_retest.json()
        assert "comparison" in retest_body
        comparison = retest_body["comparison"]
        assert "score_delta" in comparison
        assert "comparison_summary" in comparison

        # Step 13: Continuous Monitoring Event Ingestion & Alert Triage
        from backend.app.services.monitoring_service import MonitoringService
        evt = MonitoringService.log_event(
            db=db,
            agent_id=agent_id,
            event_type="canary_leak_attempt",
            severity="critical",
            details={"reason": "Canary token intercepted in agent egress stream"},
            auto_alert=True
        )
        assert evt.id is not None

        # Fetch active alerts
        res_alerts = client.get(f"/api/monitoring/alerts?agent_id={agent_id}&status=active")
        assert res_alerts.status_code == 200
        active_alerts = res_alerts.json()
        assert len(active_alerts) >= 1
        alert_to_ack = active_alerts[0]

        # Triage alert -> acknowledge
        res_ack = client.patch(f"/api/monitoring/alerts/{alert_to_ack['id']}", json={"status": "acknowledged"})
        assert res_ack.status_code == 200
        assert res_ack.json()["status"] == "acknowledged"

        # Step 14: Evidence-Backed Compliance Audit Report
        res_report = client.post("/api/reports/generate", json={
            "agent_id": agent_id,
            "framework": "OWASP_LLM_TOP_10"
        })
        assert res_report.status_code == 201
        report_data = res_report.json()
        assert report_data["framework"] == "OWASP_LLM_TOP_10"
        assert "DISCLAIMER" in report_data["certification_disclaimer"]
        assert len(report_data["measured_controls"]) >= 1

        # Verify HTML printable export
        res_export = client.get(f"/api/reports/{report_data['id']}/export?format=html")
        assert res_export.status_code == 200
        assert "Mandatory Certification Transparency Disclaimer" in res_export.text

    finally:
        app.dependency_overrides.clear()


def test_cross_tenant_authorization_isolation(db, user_a, user_b):
    """
    Verify strict security boundaries:
    User B must NEVER be able to read or modify User A's agents, findings, reports, or alerts.
    """
    from backend.app.core.security import get_current_user

    # 1. Create User A's confidential agent
    app.dependency_overrides[get_current_user] = lambda: user_a
    res_a = client.post("/api/agents", json={
        "name": "User A Confidential Agent",
        "description": "Proprietary internal agent",
        "integration_type": "sandbox"
    })
    assert res_a.status_code == 201
    agent_a_id = res_a.json()["id"]

    # Create a report for User A
    res_rep_a = client.post("/api/reports/generate", json={
        "agent_id": agent_a_id,
        "framework": "NIST_AI_RMF"
    })
    assert res_rep_a.status_code == 201
    report_a_id = res_rep_a.json()["id"]

    # Create an alert for User A
    from backend.app.services.monitoring_service import MonitoringService
    evt_a = MonitoringService.log_event(
        db=db,
        agent_id=agent_a_id,
        event_type="unauthorized_tool_attempt",
        severity="high",
        details={"tool": "delete_database"},
        auto_alert=True
    )
    alerts_a = MonitoringService.get_alerts(db=db, agent_id=agent_a_id, status="active")
    alert_a_id = alerts_a[0].id

    # 2. Switch context to User B
    app.dependency_overrides[get_current_user] = lambda: user_b

    try:
        # User B lists agents: User A's agent must NOT appear
        res_b_agents = client.get("/api/agents")
        assert res_b_agents.status_code == 200
        b_agent_ids = [a["id"] for a in res_b_agents.json()]
        assert agent_a_id not in b_agent_ids

        # User B attempts to access User A's agent directly -> 404 Not Found
        res_b_get_agent = client.get(f"/api/agents/{agent_a_id}")
        assert res_b_get_agent.status_code == 404

        # User B attempts to view User A's compliance report -> 404 Not Found
        res_b_get_rep = client.get(f"/api/reports/{report_a_id}")
        assert res_b_get_rep.status_code == 404

        # User B attempts to mutate User A's security alert -> 404 Unauthorized
        res_b_patch_alert = client.patch(f"/api/monitoring/alerts/{alert_a_id}", json={"status": "dismissed"})
        assert res_b_patch_alert.status_code == 404

        # User B lists alerts: User A's alert must NOT appear
        res_b_alerts = client.get("/api/monitoring/alerts")
        assert res_b_alerts.status_code == 200
        b_alert_ids = [a["id"] for a in res_b_alerts.json()]
        assert alert_a_id not in b_alert_ids

    finally:
        app.dependency_overrides.clear()
