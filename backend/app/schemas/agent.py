from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class AgentPermissionBase(BaseModel):
    tool_name: str
    is_allowed: bool = True
    requires_human_approval: bool = False
    rate_limit_per_min: int = 60
    argument_constraints: Dict[str, Any] = {}

class AgentPermissionCreate(AgentPermissionBase):
    pass

class AgentPermissionResponse(AgentPermissionBase):
    id: str
    agent_id: str
    model_config = ConfigDict(from_attributes=True)

class AgentBase(BaseModel):
    name: str
    description: Optional[str] = None
    integration_type: str = "sandbox"
    endpoint_url: Optional[str] = None
    system_prompt: Optional[str] = None

class AgentCreate(AgentBase):
    permissions: Optional[List[AgentPermissionCreate]] = None

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    integration_type: Optional[str] = None
    endpoint_url: Optional[str] = None
    system_prompt: Optional[str] = None
    is_active: Optional[bool] = None

class AgentResponse(AgentBase):
    id: str
    user_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    permissions: List[AgentPermissionResponse] = []
    model_config = ConfigDict(from_attributes=True)

class AgentPermissionsUpdateRequest(BaseModel):
    permissions: List[AgentPermissionBase]

class SandboxSessionCreateRequest(BaseModel):
    session_id: Optional[str] = None

class SandboxSessionResponse(BaseModel):
    session_id: str
    agent_id: str
    agent_name: str
    integration_type: str
    welcome_message: str
    allowed_tools: List[str]
    restricted_tools: List[str]
    system_prompt: Optional[str] = None

class SandboxMessageRequest(BaseModel):
    session_id: str
    message: str
    human_approval_granted: Optional[bool] = False

class ToolCallResult(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]
    decision: str  # 'allowed', 'blocked', 'requires_approval'
    reason: Optional[str] = None
    result: Optional[Any] = None
    status: str  # 'executed', 'blocked', 'approval_required'

class SandboxMessageResponse(BaseModel):
    session_id: str
    agent_response: str
    tool_calls: List[ToolCallResult] = []
    execution_time_ms: int

class ExecutionTraceResponse(BaseModel):
    id: str
    agent_id: str
    session_id: str
    user_input: str
    agent_response: Optional[str] = None
    tool_calls: List[Any] = []
    permission_decisions: List[Any] = []
    execution_time_ms: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
