import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import SessionLocal, Base, engine
from backend.app.models.user import User
from backend.app.models.agent import Agent, AgentPermission
from backend.app.models.monitoring import SecurityMonitorEvent, SecurityAlert, RetestSchedule, ComplianceReport
from backend.app.models.retest import RetestComparison
from backend.app.services.monitoring_service import MonitoringService
from backend.app.services.retest_engine import RetestEngine
from backend.app.services.report_generator import ComplianceReportGenerator
from backend.app.services.attack_engine import AttackSimulationEngine

client = TestClient(app)

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()

@pytest.fixture(scope="module")
def test_user(db_session):
    user = db_session.query(User).first()
    if not user:
        user = User(
            email="phase5_test@agentshield.ai",
            hashed_password="hashed_pw_test",
            organization_name="Phase 5 QA Org"
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user

@pytest.fixture(scope="module")
def target_agent(db_session, test_user):
    agent = db_session.query(Agent).filter(Agent.name == "Phase 5 Demo Agent", Agent.user_id == test_user.id).first()
    if not agent:
        agent = Agent(
            user_id=test_user.id,
            name="Phase 5 Demo Agent",
            description="Agent for continuous monitoring and regression testing",
            integration_type="sandbox",
            system_prompt="You are a customer support agent.",
            is_active=True
        )
        db_session.add(agent)
        db_session.commit()
        db_session.refresh(agent)

        # Add initial permissions
        perm1 = AgentPermission(
            agent_id=agent.id,
            tool_name="get_order_details",
            is_allowed=True,
            requires_human_approval=False
        )
        perm2 = AgentPermission(
            agent_id=agent.id,
            tool_name="request_refund",
            is_allowed=True,
            requires_human_approval=False  # Initially unhardened
        )
        db_session.add_all([perm1, perm2])
        db_session.commit()

    return agent


def test_monitoring_service_logging_and_alerts(db_session, target_agent):
    """Verify MonitoringService logs events and creates triageable alerts."""
    # 1. Log a low severity event
    evt_info = MonitoringService.log_event(
        db=db_session,
        agent_id=target_agent.id,
        event_type="posture_change",
        severity="info",
        details={"score": 85.0},
        auto_alert=False
    )
    assert evt_info.id is not None
    assert evt_info.severity == "info"

    # 2. Log a high severity event (should auto-create alert)
    evt_critical = MonitoringService.log_event(
        db=db_session,
        agent_id=target_agent.id,
        event_type="unauthorized_tool_attempt",
        severity="critical",
        details={"tool_name": "delete_customer_account", "reason": "Restricted tool invocation attempt"},
        auto_alert=True
    )
    assert evt_critical.id is not None
    assert evt_critical.severity == "critical"

    # Verify alert was created
    alerts = MonitoringService.get_alerts(db=db_session, agent_id=target_agent.id, status="active")
    assert len(alerts) >= 1
    target_alert = alerts[0]
    assert target_alert.severity in ("critical", "high")
    assert any("Tool: delete_customer_account" in ref for ref in target_alert.evidence_references)

    # 3. Test alert triage: acknowledge
    ack_alert = MonitoringService.update_alert_status(db=db_session, alert_id=target_alert.id, new_status="acknowledged")
    assert ack_alert.status == "acknowledged"
    assert ack_alert.acknowledged_at is not None

    # 4. Check summary
    summary = MonitoringService.get_monitoring_summary(db=db_session, agent_id=target_agent.id)
    assert summary["total_events"] >= 2
    assert summary["defense_ratio_percentage"] >= 0.0


def test_retest_engine_differential_comparison(db_session, test_user, target_agent):
    """Verify RetestEngine differential analysis and regression tracking."""
    # 1. Run baseline security test
    baseline = AttackSimulationEngine.run_security_test(
        db=db_session,
        user_id=test_user.id,
        agent_id=target_agent.id,
        categories=["unauthorized_tool_usage"],
        test_name="Phase 5 Baseline Test"
    )
    assert baseline.id is not None
    assert baseline.status == "completed"

    # 2. Run automated regression retest
    retest_result = RetestEngine.run_retest(
        db=db_session,
        user_id=test_user.id,
        agent_id=target_agent.id,
        baseline_test_id=baseline.id,
        test_name="Phase 5 Retest Run"
    )
    assert "comparison" in retest_result
    comparison = retest_result["comparison"]
    assert comparison["previous_test_id"] == baseline.id
    assert "comparison_summary" in comparison

    summary = comparison["comparison_summary"]
    assert "fixed_findings" in summary
    assert "unresolved_findings" in summary
    assert "regressed_findings" in summary
    assert "score_delta" in summary


def test_retest_schedule_creation(db_session, target_agent):
    """Verify RetestSchedule configuration and persistence."""
    schedule = RetestEngine.save_schedule(
        db=db_session,
        agent_id=target_agent.id,
        frequency="weekly",
        scenario_ids=["scen_1", "scen_2"],
        is_active=True
    )
    assert schedule.id is not None
    assert schedule.frequency == "weekly"
    assert schedule.is_active is True

    schedules = RetestEngine.get_schedules(db=db_session, agent_id=target_agent.id)
    assert len(schedules) >= 1
    assert any(s.frequency == "weekly" for s in schedules)


def test_compliance_report_generator_and_disclaimer(db_session, test_user, target_agent):
    """Verify ComplianceReportGenerator produces evidence-backed reports with mandatory certification disclaimer."""
    # Generate OWASP report
    report = ComplianceReportGenerator.generate_report(
        db=db_session,
        user_id=test_user.id,
        agent_id=target_agent.id,
        framework="OWASP_LLM_TOP_10"
    )
    assert report.id is not None
    assert report.framework == "OWASP_LLM_TOP_10"
    assert "DISCLAIMER" in report.certification_disclaimer
    assert "does NOT constitute official certification" in report.certification_disclaimer

    # Verify separation of measured controls vs unverified controls
    assert isinstance(report.measured_controls, list)
    assert isinstance(report.unverified_controls, list)
    assert len(report.controls_evaluated) == len(report.measured_controls) + len(report.unverified_controls)

    # Test NIST AI RMF report
    nist_report = ComplianceReportGenerator.generate_report(
        db=db_session,
        user_id=test_user.id,
        agent_id=target_agent.id,
        framework="NIST_AI_RMF"
    )
    assert nist_report.framework == "NIST_AI_RMF"
    assert len(nist_report.controls_evaluated) == 4


def test_monitoring_and_retest_apis(target_agent, test_user, db_session):
    """Verify HTTP API endpoints for monitoring, retests, and reports."""
    # 1. GET /api/monitoring/events
    res_events = client.get(f"/api/monitoring/events?agent_id={target_agent.id}")
    assert res_events.status_code == 200
    events = res_events.json()
    assert isinstance(events, list)

    # 2. GET /api/monitoring/summary
    res_summary = client.get(f"/api/monitoring/summary?agent_id={target_agent.id}")
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert "total_events" in summary
    assert "defense_ratio_percentage" in summary

    # 3. GET /api/retests/comparisons
    res_comps = client.get(f"/api/retests/comparisons?agent_id={target_agent.id}")
    assert res_comps.status_code == 200
    comps = res_comps.json()
    assert isinstance(comps, list)

    # 4. POST /api/reports/generate
    res_gen = client.post("/api/reports/generate", json={
        "agent_id": target_agent.id,
        "framework": "MITRE_ATLAS"
    })
    assert res_gen.status_code == 201
    rep_data = res_gen.json()
    assert rep_data["framework"] == "MITRE_ATLAS"
    rep_id = rep_data["id"]

    # 5. GET /api/reports/{id}/export?format=html
    res_export = client.get(f"/api/reports/{rep_id}/export?format=html")
    assert res_export.status_code == 200
    assert "text/html" in res_export.headers.get("content-type", "")
    assert "Mandatory Certification Transparency Disclaimer" in res_export.text
