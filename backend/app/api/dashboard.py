from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.agent import Agent
from backend.app.models.test_run import SecurityTest, TestExecution
from backend.app.models.finding import VulnerabilityFinding
from backend.app.schemas.dashboard import (
    DashboardStatsResponse,
    SummaryKPI,
    CategoryCount,
    BlockVsSuccessRate,
    TimelinePoint,
    AgentRiskComparison,
    RecentTestSummary
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Total Agents
    total_agents = db.query(Agent).filter(Agent.user_id == current_user.id).count()

    # 2. Security Tests Executed
    total_tests = db.query(SecurityTest).filter(SecurityTest.user_id == current_user.id).count()

    # 3. Vulnerabilities Detected & Critical Findings
    findings_query = db.query(VulnerabilityFinding).join(SecurityTest).filter(SecurityTest.user_id == current_user.id)
    total_vulnerabilities = findings_query.count()
    critical_findings = findings_query.filter(VulnerabilityFinding.severity == "critical").count()

    # 4. Average Risk Score
    tests = db.query(SecurityTest).filter(
        SecurityTest.user_id == current_user.id,
        SecurityTest.status == "completed"
    ).all()
    if tests:
        avg_score = round(sum(t.overall_risk_score for t in tests) / len(tests), 1)
    else:
        avg_score = 100.0

    kpis = SummaryKPI(
        total_agents=total_agents,
        security_tests_executed=total_tests,
        vulnerabilities_detected=total_vulnerabilities,
        critical_findings=critical_findings,
        average_risk_score=avg_score
    )

    # 5. Vulnerability Distribution by Category
    categories = [
        "prompt_injection",
        "unauthorized_tool_usage",
        "sensitive_data_exposure",
        "excessive_agency"
    ]
    dist_list = []
    for cat in categories:
        cat_findings = findings_query.filter(VulnerabilityFinding.category == cat).all()
        crit = sum(1 for f in cat_findings if f.severity == "critical")
        hi = sum(1 for f in cat_findings if f.severity == "high")
        med = sum(1 for f in cat_findings if f.severity == "medium")
        low = sum(1 for f in cat_findings if f.severity == "low")
        dist_list.append(CategoryCount(
            category=cat,
            count=len(cat_findings),
            critical=crit,
            high=hi,
            medium=med,
            low=low
        ))

    # 6. Attack Block vs Success Rate
    executions = db.query(TestExecution).join(SecurityTest).filter(SecurityTest.user_id == current_user.id).all()
    blocked_count = sum(1 for e in executions if e.result == "blocked")
    vuln_count = sum(1 for e in executions if e.result == "vulnerable")
    passed_count = sum(1 for e in executions if e.result == "passed")

    block_vs_success = BlockVsSuccessRate(
        attack_blocked=blocked_count,
        attack_succeeded=vuln_count,
        safe_passed=passed_count
    )

    # 7. Timeline (past 7 days)
    timeline = []
    today = datetime.utcnow().date()
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_str = day.strftime("%b %d")
        t_count = db.query(SecurityTest).filter(
            SecurityTest.user_id == current_user.id,
            func.date(SecurityTest.created_at) == day
        ).count()
        v_count = findings_query.filter(
            func.date(VulnerabilityFinding.created_at) == day
        ).count()
        timeline.append(TimelinePoint(date=day_str, tests_run=t_count, vulnerabilities=v_count))

    # 8. Agent Risk Comparisons
    user_agents = db.query(Agent).filter(Agent.user_id == current_user.id).all()
    agent_comparisons = []
    for ag in user_agents:
        ag_tests = [t for t in tests if t.agent_id == ag.id]
        if ag_tests:
            latest_test = max(ag_tests, key=lambda x: x.created_at)
            score = latest_test.overall_risk_score
            crits = sum(1 for f in latest_test.findings if f.severity == "critical")
        else:
            score = 100.0
            crits = 0

        status_label = "Optimal" if score >= 90 else ("Moderate Risk" if score >= 70 else "High Risk")
        agent_comparisons.append(AgentRiskComparison(
            agent_id=ag.id,
            agent_name=ag.name,
            risk_score=score,
            critical_count=crits,
            status=status_label
        ))

    # 9. Recent Tests
    recent_tests = []
    recent_test_objs = db.query(SecurityTest).filter(
        SecurityTest.user_id == current_user.id
    ).order_by(SecurityTest.created_at.desc()).limit(5).all()

    for rt in recent_test_objs:
        crits = sum(1 for f in rt.findings if f.severity == "critical")
        recent_tests.append(RecentTestSummary(
            test_id=rt.id,
            agent_name=rt.agent.name if rt.agent else "Unknown Agent",
            status=rt.status,
            score=rt.overall_risk_score,
            critical_findings=crits,
            total_scenarios=rt.total_scenarios,
            created_at=rt.created_at
        ))

    return DashboardStatsResponse(
        kpis=kpis,
        vulnerability_distribution=dist_list,
        block_vs_success=block_vs_success,
        timeline=timeline,
        agent_comparisons=agent_comparisons,
        recent_tests=recent_tests
    )
