import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Text, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class AttackScenario(Base):
    __tablename__ = "attack_scenarios"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    category = Column(String(100), nullable=False, index=True) # prompt_injection, unauthorized_tool_usage, sensitive_data_exposure, excessive_agency
    subcategory = Column(String(100), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    test_input = Column(Text, nullable=False)
    expected_behavior = Column(Text, nullable=False)
    synthetic_secrets = Column(JSON, default=list) # e.g. ["API_KEY_99128", "PROD_DB_SECRET"]
    target_tool = Column(String(100), nullable=True)
    severity = Column(String(50), default="medium") # critical, high, medium, low
    tags = Column(JSON, default=list) # e.g. ["injection", "cve", "owasp-top-10"]
    version = Column(String(20), default="1.0.0")
    evaluation_criteria = Column(JSON, default=dict)
    is_built_in = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    executions = relationship("TestExecution", back_populates="scenario")
