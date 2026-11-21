import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, JSON
from backend.app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    action = Column(String(100), nullable=False) # e.g. 'agent_created', 'test_started', 'policy_updated'
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(36), nullable=False)
    details = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

class ApiConfiguration(Base):
    __tablename__ = "api_configurations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    service_name = Column(String(100), nullable=False) # 'gemini', 'anthropic', 'openai'
    key_hint = Column(String(50), nullable=False) # e.g. '...AIzaSy'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
