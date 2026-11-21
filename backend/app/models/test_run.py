import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Float, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class SecurityTest(Base):
    __tablename__ = "security_tests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    agent_id = Column(String(36), ForeignKey("agents.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    status = Column(String(50), default="pending", index=True) # pending, running, completed, failed
    total_scenarios = Column(Integer, default=0)
    passed_scenarios = Column(Integer, default=0)
    failed_scenarios = Column(Integer, default=0)
    blocked_scenarios = Column(Integer, default=0)
    inconclusive_scenarios = Column(Integer, default=0)
    overall_risk_score = Column(Float, default=100.0) # 0 to 100
    coverage_percent = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    completed_at = Column(DateTime, nullable=True)

    agent = relationship("Agent", back_populates="tests")
    user = relationship("User", back_populates="tests")
    executions = relationship("TestExecution", back_populates="test", cascade="all, delete-orphan")
    findings = relationship("VulnerabilityFinding", back_populates="test", cascade="all, delete-orphan")

class TestExecution(Base):
    __tablename__ = "test_executions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    test_id = Column(String(36), ForeignKey("security_tests.id"), nullable=False, index=True)
    scenario_id = Column(String(36), ForeignKey("attack_scenarios.id"), nullable=False, index=True)
    prompt_used = Column(Text, nullable=False)
    actual_response = Column(Text, nullable=True)
    tools_attempted = Column(JSON, default=list)
    tools_blocked = Column(JSON, default=list)
    tools_executed = Column(JSON, default=list)
    result = Column(String(50), default="passed", index=True) # passed, vulnerable, blocked, error
    severity = Column(String(50), default="low")
    evidence = Column(JSON, default=dict)
    evaluator_output = Column(JSON, default=dict)
    scenario_version = Column(String(20), default="1.0.0")
    is_replay = Column(Boolean, default=False)
    replayed_from_id = Column(String(36), nullable=True)
    execution_time_ms = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    test = relationship("SecurityTest", back_populates="executions")
    scenario = relationship("AttackScenario", back_populates="executions")
    findings = relationship("VulnerabilityFinding", back_populates="execution", cascade="all, delete-orphan")
