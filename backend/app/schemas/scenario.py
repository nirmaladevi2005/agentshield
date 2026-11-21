from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime

class AttackScenarioBase(BaseModel):
    category: str
    subcategory: Optional[str] = None
    name: str
    description: str
    test_input: str
    expected_behavior: str
    synthetic_secrets: List[str] = []
    target_tool: Optional[str] = None
    severity: str = "medium"
    tags: List[str] = []
    version: str = "1.0.0"
    evaluation_criteria: dict = {}
    is_built_in: bool = True

class AttackScenarioCreate(AttackScenarioBase):
    pass

class AttackScenarioResponse(AttackScenarioBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
