from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.models.monitoring import SecurityMonitorEvent, SecurityAlert
from backend.app.models.agent import Agent


class MonitoringService:
    @staticmethod
    def log_event(
        db: Session,
        agent_id: str,
        event_type: str,
        severity: str = "info",
        details: Optional[Dict[str, Any]] = None,
        auto_alert: bool = True
    ) -> SecurityMonitorEvent:
        """
        Log a real-time security monitoring event.
        If severity is critical or high, or if it indicates an exploit/regression, automatically creates an alert.
        """
        event = SecurityMonitorEvent(
            agent_id=agent_id,
            event_type=event_type,
            severity=severity,
            details=details or {},
            timestamp=datetime.utcnow()
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        if auto_alert and severity in ("critical", "high"):
            MonitoringService.create_alert_from_event(db, event)

        return event

    @staticmethod
    def create_alert_from_event(db: Session, event: SecurityMonitorEvent) -> SecurityAlert:
        """Create a triageable security alert linked to an event."""
        title_map = {
            "unauthorized_tool_attempt": "Unauthorized Tool Invocation Blocked/Attempted",
            "permission_denied": "Policy Violation: Permission Denied",
            "canary_leak_attempt": "Sensitive Data Leak: Canary Token Exposed",
            "approval_requested": "High-Risk Tool Requires Human Approval",
            "posture_change": "Security Posture Changed",
            "suspicious_pattern": "Anomalous Behavioral Pattern Detected",
            "retest_regression": "CRITICAL: Security Regression Detected",
            "new_vulnerability": "New Confirmed Vulnerability Discovered"
        }
        title = title_map.get(event.event_type, f"Security Alert: {event.event_type.replace('_', ' ').title()}")
        details = event.details or {}
        description = details.get("reason") or details.get("description") or f"Security monitoring recorded an event of type '{event.event_type}' on agent."
        
        evidence_refs = []
        if "trace_id" in details:
            evidence_refs.append(f"Trace: {details['trace_id']}")
        if "tool_name" in details:
            evidence_refs.append(f"Tool: {details['tool_name']}")
        if "finding_id" in details:
            evidence_refs.append(f"Finding: {details['finding_id']}")

        alert = SecurityAlert(
            agent_id=event.agent_id,
            alert_type=event.event_type,
            severity=event.severity,
            title=title,
            description=description,
            evidence_references=evidence_refs,
            recommended_response="Review agent permission boundaries and verify security policies in Agent Configuration.",
            status="active",
            created_at=datetime.utcnow()
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return alert

    @staticmethod
    def get_events(
        db: Session,
        user_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        severity: Optional[str] = None,
        event_type: Optional[str] = None,
        limit: int = 50
    ) -> List[SecurityMonitorEvent]:
        query = db.query(SecurityMonitorEvent)
        if user_id:
            query = query.join(Agent, Agent.id == SecurityMonitorEvent.agent_id).filter(Agent.user_id == user_id)
        if agent_id:
            query = query.filter(SecurityMonitorEvent.agent_id == agent_id)
        if severity:
            query = query.filter(SecurityMonitorEvent.severity == severity)
        if event_type:
            query = query.filter(SecurityMonitorEvent.event_type == event_type)
        return query.order_by(desc(SecurityMonitorEvent.timestamp)).limit(limit).all()

    @staticmethod
    def get_alerts(
        db: Session,
        user_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 50
    ) -> List[SecurityAlert]:
        query = db.query(SecurityAlert)
        if user_id:
            query = query.join(Agent, Agent.id == SecurityAlert.agent_id).filter(Agent.user_id == user_id)
        if agent_id:
            query = query.filter(SecurityAlert.agent_id == agent_id)
        if status:
            query = query.filter(SecurityAlert.status == status)
        if severity:
            query = query.filter(SecurityAlert.severity == severity)
        return query.order_by(desc(SecurityAlert.created_at)).limit(limit).all()

    @staticmethod
    def update_alert_status(
        db: Session,
        alert_id: str,
        new_status: str,
        user_id: Optional[str] = None
    ) -> Optional[SecurityAlert]:
        query = db.query(SecurityAlert).filter(SecurityAlert.id == alert_id)
        if user_id:
            query = query.join(Agent, Agent.id == SecurityAlert.agent_id).filter(Agent.user_id == user_id)
        alert = query.first()
        if not alert:
            return None
        alert.status = new_status
        if new_status in ("acknowledged", "dismissed"):
            alert.acknowledged_at = datetime.utcnow()
        db.commit()
        db.refresh(alert)
        return alert

    @staticmethod
    def get_monitoring_summary(
        db: Session,
        user_id: Optional[str] = None,
        agent_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Aggregate continuous monitoring statistics."""
        event_query = db.query(SecurityMonitorEvent)
        alert_query = db.query(SecurityAlert)
        if user_id:
            event_query = event_query.join(Agent, Agent.id == SecurityMonitorEvent.agent_id).filter(Agent.user_id == user_id)
            alert_query = alert_query.join(Agent, Agent.id == SecurityAlert.agent_id).filter(Agent.user_id == user_id)
        if agent_id:
            event_query = event_query.filter(SecurityMonitorEvent.agent_id == agent_id)
            alert_query = alert_query.filter(SecurityAlert.agent_id == agent_id)

        all_events = event_query.all()
        active_alerts = alert_query.filter(SecurityAlert.status == "active").all()
        acknowledged_alerts = alert_query.filter(SecurityAlert.status == "acknowledged").all()

        total_events = len(all_events)
        blocked_events = sum(1 for e in all_events if e.event_type in ("permission_denied", "canary_leak_attempt") or (e.details and e.details.get("decision") == "deny"))
        exploit_events = sum(1 for e in all_events if e.event_type in ("unauthorized_tool_attempt", "retest_regression") and (e.details and e.details.get("decision") != "deny"))

        critical_alerts = sum(1 for a in active_alerts if a.severity == "critical")
        high_alerts = sum(1 for a in active_alerts if a.severity == "high")

        defense_ratio = 100.0 if (blocked_events + exploit_events) == 0 else round((blocked_events / (blocked_events + exploit_events)) * 100, 1)

        return {
            "total_events": total_events,
            "blocked_events": blocked_events,
            "exploit_events": exploit_events,
            "defense_ratio_percentage": defense_ratio,
            "active_alerts_count": len(active_alerts),
            "critical_alerts_count": critical_alerts,
            "high_alerts_count": high_alerts,
            "acknowledged_alerts_count": len(acknowledged_alerts),
        }
