from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime

class RemediationRecommendationResponse(BaseModel):
    id: str
    finding_id: str
    recommendation_text: str
    policy_patch_suggestion: Optional[str] = None
    implementation_code: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class VulnerabilityFindingResponse(BaseModel):
    id: str
    test_id: str
    execution_id: str
    category: str
    severity: str
    title: str
    description: str
    evidence: Dict[str, Any] = {}
    evaluator_type: str
    confidence: float
    status: str
    created_at: datetime
    recommendations: List[RemediationRecommendationResponse] = []
    model_config = ConfigDict(from_attributes=True)

class VulnerabilityIntelligenceResponse(BaseModel):
    id: str
    finding_id: str
    explanation: str
    root_cause_hypothesis: str
    attack_technique: str
    observed_facts: Dict[str, Any] = {}
    ai_hypotheses: Dict[str, Any] = {}
    security_impact: str
    business_impact: str
    recommended_remediation: str
    confidence_score: float
    evidence_references: List[str] = []
    ai_provider: str
    tokens_used: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RemediationPlanResponse(BaseModel):
    finding_id: str
    category: str
    root_cause: str
    recommended_fix: str
    proposed_policy_changes: Dict[str, Any]
    example_configuration: str
    expected_security_improvement: str
    validation_test_scenarios: List[str] = []
    model_config = ConfigDict(from_attributes=True)
