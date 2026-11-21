import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text, JSON, Integer
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Agent(Base):
    __tablename__ = "agents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    integration_type = Column(String(50), default="sandbox") # 'sandbox', 'adapter', 'http_endpoint'
    endpoint_url = Column(String(512), nullable=True)
    system_prompt = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="agents")
    permissions = relationship("AgentPermission", back_populates="agent", cascade="all, delete-orphan")
    tests = relationship("SecurityTest", back_populates="agent", cascade="all, delete-orphan")
    traces = relationship("ExecutionTrace", back_populates="agent", cascade="all, delete-orphan")

class AgentPermission(Base):
    __tablename__ = "agent_permissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String(36), ForeignKey("agents.id"), nullable=False, index=True)
    tool_name = Column(String(100), nullable=False)
    is_allowed = Column(Boolean, default=True)
    requires_human_approval = Column(Boolean, default=False)
    rate_limit_per_min = Column(Integer, default=60)
    argument_constraints = Column(JSON, default=dict)

    agent = relationship("Agent", back_populates="permissions")
