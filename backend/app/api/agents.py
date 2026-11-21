from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.agent import Agent, AgentPermission
from backend.app.models.trace import ExecutionTrace
from backend.app.schemas.agent import (
    AgentCreate,
    AgentUpdate,
    AgentResponse,
    AgentPermissionResponse,
    AgentPermissionsUpdateRequest,
    SandboxSessionCreateRequest,
    SandboxSessionResponse,
    SandboxMessageRequest,
    SandboxMessageResponse,
    ExecutionTraceResponse
)
from backend.app.services.demo_agent import DemoCustomerSupportAgent

router = APIRouter(prefix="/agents", tags=["Agents"])

@router.get("", response_model=List[AgentResponse])
def list_agents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Agent).filter(Agent.user_id == current_user.id).order_by(Agent.created_at.desc()).all()

@router.post("", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
def create_agent(
    agent_in: AgentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    agent = Agent(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=agent_in.name,
        description=agent_in.description,
        integration_type=agent_in.integration_type,
        endpoint_url=agent_in.endpoint_url,
        system_prompt=agent_in.system_prompt
    )
    db.add(agent)
    db.flush()

    if agent_in.permissions:
        for p in agent_in.permissions:
            perm = AgentPermission(
                id=str(uuid.uuid4()),
                agent_id=agent.id,
                tool_name=p.tool_name,
                is_allowed=p.is_allowed,
                requires_human_approval=p.requires_human_approval,
                rate_limit_per_min=p.rate_limit_per_min,
                argument_constraints=p.argument_constraints
            )
            db.add(perm)
    else:
        # Standard customer support demo baseline tools
        default_tools = [
            ("get_customer_profile", True, False),
            ("get_order_details", True, False),
            ("check_order_status", True, False),
            ("request_refund", True, True), # Sensitive: requires human approval!
            ("send_mock_email", True, False),
            ("execute_command", False, True), # Restricted!
            ("delete_database", False, True)   # Restricted!
        ]
        for tool, allowed, approval in default_tools:
            perm = AgentPermission(
                id=str(uuid.uuid4()),
                agent_id=agent.id,
                tool_name=tool,
                is_allowed=allowed,
                requires_human_approval=approval
            )
            db.add(perm)

    db.commit()
    db.refresh(agent)
    return agent

@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == current_user.id
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@router.put("/{agent_id}", response_model=AgentResponse)
def update_agent(
    agent_id: str,
    agent_update: AgentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == current_user.id
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    update_data = agent_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(agent, field, value)

    db.commit()
    db.refresh(agent)
    return agent

@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agent(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == current_user.id
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    db.delete(agent)
    db.commit()
    return None

# ==================== PERMISSIONS ====================

@router.get("/{agent_id}/permissions", response_model=List[AgentPermissionResponse])
def get_agent_permissions(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == current_user.id
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    return db.query(AgentPermission).filter(AgentPermission.agent_id == agent_id).all()

@router.put("/{agent_id}/permissions", response_model=List[AgentPermissionResponse])
def update_agent_permissions(
    agent_id: str,
    payload: AgentPermissionsUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == current_user.id
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Update or add permissions
    for p_in in payload.permissions:
        perm = db.query(AgentPermission).filter(
            AgentPermission.agent_id == agent_id,
            AgentPermission.tool_name == p_in.tool_name
        ).first()

        if perm:
            perm.is_allowed = p_in.is_allowed
            perm.requires_human_approval = p_in.requires_human_approval
            perm.rate_limit_per_min = p_in.rate_limit_per_min
            perm.argument_constraints = p_in.argument_constraints
        else:
            new_perm = AgentPermission(
                id=str(uuid.uuid4()),
                agent_id=agent_id,
                tool_name=p_in.tool_name,
                is_allowed=p_in.is_allowed,
                requires_human_approval=p_in.requires_human_approval,
                rate_limit_per_min=p_in.rate_limit_per_min,
                argument_constraints=p_in.argument_constraints
            )
            db.add(new_perm)

    db.commit()
    return db.query(AgentPermission).filter(AgentPermission.agent_id == agent_id).all()

# ==================== SANDBOX INTERACTION ====================

@router.post("/{agent_id}/sandbox/session", response_model=SandboxSessionResponse)
def create_sandbox_session(
    agent_id: str,
    req: SandboxSessionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == current_user.id
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    session_id = req.session_id or f"sess_{uuid.uuid4().hex[:12]}"
    perms = db.query(AgentPermission).filter(AgentPermission.agent_id == agent_id).all()
    allowed_tools = [p.tool_name for p in perms if p.is_allowed]
    restricted_tools = [p.tool_name for p in perms if not p.is_allowed]

    welcome = (
        f"Session established with '{agent.name}'. "
        f"Sandbox isolated. Synthetic data loaded. "
        f"Allowed tools: {len(allowed_tools)} | Restricted tools: {len(restricted_tools)}."
    )

    return SandboxSessionResponse(
        session_id=session_id,
        agent_id=agent.id,
        agent_name=agent.name,
        integration_type=agent.integration_type,
        welcome_message=welcome,
        allowed_tools=allowed_tools,
        restricted_tools=restricted_tools,
        system_prompt=agent.system_prompt
    )

@router.post("/{agent_id}/sandbox/message", response_model=SandboxMessageResponse)
def send_sandbox_message(
    agent_id: str,
    req: SandboxMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == current_user.id
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Dispatch to Demo Agent within sandbox
    result = DemoCustomerSupportAgent.process_message(
        db=db,
        agent=agent,
        session_id=req.session_id,
        user_input=req.message,
        human_approval_granted=bool(req.human_approval_granted)
    )

    return SandboxMessageResponse(**result)

# ==================== TRACES ====================

@router.get("/{agent_id}/traces", response_model=List[ExecutionTraceResponse])
def get_agent_traces(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == current_user.id
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    traces = db.query(ExecutionTrace).filter(
        ExecutionTrace.agent_id == agent_id
    ).order_by(ExecutionTrace.created_at.desc()).limit(50).all()

    return traces
