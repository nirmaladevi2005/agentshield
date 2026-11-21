from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class SummaryKPI(BaseModel):
    total_agents: int
    security_tests_executed: int
    vulnerabilities_detected: int
    critical_findings: int
    average_risk_score: float

class CategoryCount(BaseModel):
    category: str
    count: int
    critical: int
    high: int
    medium: int
    low: int

class BlockVsSuccessRate(BaseModel):
    attack_blocked: int
    attack_succeeded: int
    safe_passed: int

class TimelinePoint(BaseModel):
    date: str
    tests_run: int
    vulnerabilities: int

class AgentRiskComparison(BaseModel):
    agent_id: str
    agent_name: str
    risk_score: float
    critical_count: int
    status: str

class RecentTestSummary(BaseModel):
    test_id: str
    agent_name: str
    status: str
    score: float
    critical_findings: int
    total_scenarios: int
    created_at: datetime

class DashboardStatsResponse(BaseModel):
    kpis: SummaryKPI
    vulnerability_distribution: List[CategoryCount]
    block_vs_success: BlockVsSuccessRate
    timeline: List[TimelinePoint]
    agent_comparisons: List[AgentRiskComparison]
    recent_tests: List[RecentTestSummary]
