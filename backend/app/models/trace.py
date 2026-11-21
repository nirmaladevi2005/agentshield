import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class ExecutionTrace(Base):
    __tablename__ = "execution_traces"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    agent_id = Column(String(36), ForeignKey("agents.id"), nullable=False, index=True)
    session_id = Column(String(64), nullable=False, index=True)
    user_input = Column(Text, nullable=False)
    agent_response = Column(Text, nullable=True)
    tool_calls = Column(JSON, default=list) # List of {tool_name, arguments, result, status}
    permission_decisions = Column(JSON, default=list) # List of {tool_name, decision, reason}
    execution_time_ms = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    agent = relationship("Agent", back_populates="traces")
