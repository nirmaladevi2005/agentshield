from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from backend.app.schemas.finding import VulnerabilityFindingResponse

class TestExecuteRequest(BaseModel):
    agent_id: str
    scenario_ids: Optional[List[str]] = None
    categories: Optional[List[str]] = None
    test_name: Optional[str] = None
    use_gemini_evaluator: bool = False

class TestExecutionResponse(BaseModel):
    id: str
    test_id: str
    scenario_id: str
    prompt_used: str
    actual_response: Optional[str] = None
    tools_attempted: List[str] = []
    tools_blocked: List[str] = []
    tools_executed: List[str] = []
    result: str
    severity: str
    evidence: Dict[str, Any] = {}
    evaluator_output: Dict[str, Any] = {}
    scenario_version: str = "1.0.0"
    is_replay: bool = False
    replayed_from_id: Optional[str] = None
    execution_time_ms: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SecurityTestResponse(BaseModel):
    id: str
    agent_id: str
    user_id: str
    name: str
    status: str
    total_scenarios: int
    passed_scenarios: int
    failed_scenarios: int
    blocked_scenarios: int
    inconclusive_scenarios: int = 0
    overall_risk_score: float
    coverage_percent: float
    created_at: datetime
    completed_at: Optional[datetime] = None
    executions: List[TestExecutionResponse] = []
    findings: List[VulnerabilityFindingResponse] = []
    model_config = ConfigDict(from_attributes=True)
