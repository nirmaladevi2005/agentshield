import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class VulnerabilityFinding(Base):
    __tablename__ = "vulnerability_findings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    test_id = Column(String(36), ForeignKey("security_tests.id"), nullable=False, index=True)
    execution_id = Column(String(36), ForeignKey("test_executions.id"), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    severity = Column(String(50), nullable=False, index=True) # critical, high, medium, low
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    evidence = Column(JSON, default=dict)
    evaluator_type = Column(String(50), default="deterministic") # deterministic, gemini, hybrid
    confidence = Column(Float, default=1.0)
    status = Column(String(50), default="open", index=True) # open, resolved, acknowledged
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    test = relationship("SecurityTest", back_populates="findings")
    execution = relationship("TestExecution", back_populates="findings")
    recommendations = relationship("RemediationRecommendation", back_populates="finding", cascade="all, delete-orphan")

class RemediationRecommendation(Base):
    __tablename__ = "remediation_recommendations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    finding_id = Column(String(36), ForeignKey("vulnerability_findings.id"), nullable=False, index=True)
    recommendation_text = Column(Text, nullable=False)
    policy_patch_suggestion = Column(Text, nullable=True)
    implementation_code = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    finding = relationship("VulnerabilityFinding", back_populates="recommendations")
