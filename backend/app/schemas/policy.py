from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime

class PolicyRecommendationResponse(BaseModel):
    id: str
    agent_id: str
    finding_id: Optional[str] = None
    tool_name: str
    current_policy: Dict[str, Any]
    proposed_policy: Dict[str, Any]
    justification: str
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class PolicyAuditResponse(BaseModel):
    id: str
    agent_id: str
    recommendation_id: str
    user_id: str
    action: str
    policy_diff: Dict[str, Any]
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class PolicyApplyResponse(BaseModel):
    agent_id: str
    applied_count: int
    applied_changes: List[Dict[str, Any]]

class RetestResponse(BaseModel):
    test_id: str
    test_name: str
    total_scenarios: int
    blocked_scenarios: int
    failed_scenarios: int
    passed_scenarios: int
    overall_risk_score: float
    status: str
    hardening_verified: bool
