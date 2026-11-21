from datetime import datetime
import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class SecurityMonitorEvent(Base):
    __tablename__ = "security_monitor_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String(36), ForeignKey("agents.id"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    # Types: unauthorized_tool_attempt, permission_denied, approval_requested, approval_granted, canary_leak_attempt, suspicious_pattern, posture_change
    severity = Column(String(50), default="info", index=True)
    # Severity: critical, high, medium, low, info
    details = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    agent = relationship("Agent", backref="monitor_events")

    def to_dict(self):
        return {
            "id": self.id,
            "agent_id": self.agent_id,
            "event_type": self.event_type,
            "severity": self.severity,
            "details": self.details or {},
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


class SecurityAlert(Base):
    __tablename__ = "security_alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String(36), ForeignKey("agents.id"), nullable=False, index=True)
    alert_type = Column(String(100), nullable=False, index=True)
    # Types: new_confirmed_vulnerability, successful_unauthorized_action, risk_score_spike, retest_failed, policy_regression
    severity = Column(String(50), default="medium", index=True)
    # Severity: critical, high, medium, low
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    evidence_references = Column(JSON, default=list)
    recommended_response = Column(Text, nullable=True)
    status = Column(String(50), default="active", index=True)
    # Status: active, acknowledged, dismissed
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    acknowledged_at = Column(DateTime, nullable=True)

    agent = relationship("Agent", backref="security_alerts")

    def to_dict(self):
        return {
            "id": self.id,
            "agent_id": self.agent_id,
            "alert_type": self.alert_type,
            "severity": self.severity,
            "title": self.title,
            "description": self.description,
            "evidence_references": self.evidence_references or [],
            "recommended_response": self.recommended_response,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "acknowledged_at": self.acknowledged_at.isoformat() if self.acknowledged_at else None,
        }


class RetestSchedule(Base):
    __tablename__ = "retest_schedules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String(36), ForeignKey("agents.id"), nullable=False, index=True)
    frequency = Column(String(50), default="daily", nullable=False)
    # Frequency: hourly, daily, weekly, post_policy_change
    scenario_ids = Column(JSON, default=list)
    is_active = Column(Boolean, default=True, nullable=False)
    last_run_at = Column(DateTime, nullable=True)
    next_run_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    agent = relationship("Agent", backref="retest_schedules")

    def to_dict(self):
        return {
            "id": self.id,
            "agent_id": self.agent_id,
            "frequency": self.frequency,
            "scenario_ids": self.scenario_ids or [],
            "is_active": self.is_active,
            "last_run_at": self.last_run_at.isoformat() if self.last_run_at else None,
            "next_run_at": self.next_run_at.isoformat() if self.next_run_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ComplianceReport(Base):
    __tablename__ = "compliance_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    agent_id = Column(String(36), ForeignKey("agents.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    framework = Column(String(100), nullable=False)
    # Frameworks: OWASP_LLM_TOP_10, NIST_AI_RMF, MITRE_ATLAS, AGENTSHIELD_STANDARD
    summary = Column(Text, nullable=False)
    score = Column(JSON, default=dict)
    controls_evaluated = Column(JSON, default=list)
    measured_controls = Column(JSON, default=list)
    unverified_controls = Column(JSON, default=list)
    findings = Column(JSON, default=list)
    compliance_percentage = Column(String(20), default="0%")
    certification_disclaimer = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", backref="compliance_reports")
    agent = relationship("Agent", backref="compliance_reports")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "agent_id": self.agent_id,
            "title": self.title,
            "framework": self.framework,
            "summary": self.summary,
            "score": self.score or {},
            "controls_evaluated": self.controls_evaluated or [],
            "measured_controls": self.measured_controls or [],
            "unverified_controls": self.unverified_controls or [],
            "findings": self.findings or [],
            "compliance_percentage": self.compliance_percentage,
            "certification_disclaimer": self.certification_disclaimer,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
