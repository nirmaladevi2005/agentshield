import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, ForeignKey, Text, JSON, Integer
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class VulnerabilityIntelligence(Base):
    __tablename__ = "vulnerability_intelligence"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    finding_id = Column(String(36), ForeignKey("vulnerability_findings.id"), unique=True, nullable=False, index=True)
    
    explanation = Column(Text, nullable=False)
    root_cause_hypothesis = Column(Text, nullable=False)
    attack_technique = Column(String(100), nullable=False, index=True)
    
    observed_facts = Column(JSON, default=dict)
    ai_hypotheses = Column(JSON, default=dict)
    
    security_impact = Column(Text, nullable=False)
    business_impact = Column(Text, nullable=False)
    recommended_remediation = Column(Text, nullable=False)
    
    confidence_score = Column(Float, default=1.0)
    evidence_references = Column(JSON, default=list)
    ai_provider = Column(String(50), default="gemini") # 'gemini' or 'offline_deterministic'
    tokens_used = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    finding = relationship("VulnerabilityFinding", backref="intelligence", uselist=False)

class PolicyRecommendation(Base):
    __tablename__ = "policy_recommendations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    agent_id = Column(String(36), ForeignKey("agents.id"), nullable=False, index=True)
    finding_id = Column(String(36), ForeignKey("vulnerability_findings.id"), nullable=True, index=True)
    
    tool_name = Column(String(100), nullable=False)
    current_policy = Column(JSON, nullable=False) # { "is_allowed": true, "requires_human_approval": false, "rate_limit_per_min": 60 }
    proposed_policy = Column(JSON, nullable=False) # { "is_allowed": false, "requires_human_approval": true, "rate_limit_per_min": 10 }
    justification = Column(Text, nullable=False)
    
    # Status: 'pending', 'approved', 'rejected', 'applied'
    status = Column(String(50), default="pending", index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(String(36), ForeignKey("users.id"), nullable=True)

    agent = relationship("Agent", backref="policy_recommendations")
    finding = relationship("VulnerabilityFinding", backref="policy_recommendations")
    audit_logs = relationship("PolicyChangeAudit", back_populates="recommendation", cascade="all, delete-orphan")

class PolicyChangeAudit(Base):
    __tablename__ = "policy_change_audits"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    agent_id = Column(String(36), ForeignKey("agents.id"), nullable=False, index=True)
    recommendation_id = Column(String(36), ForeignKey("policy_recommendations.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    
    action = Column(String(50), nullable=False) # 'approved', 'rejected', 'applied'
    policy_diff = Column(JSON, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    recommendation = relationship("PolicyRecommendation", back_populates="audit_logs")
