from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.services.monitoring_service import MonitoringService

router = APIRouter(prefix="/monitoring", tags=["Security Monitoring"])


class AlertStatusUpdate(BaseModel):
    status: str  # active, acknowledged, dismissed


@router.get("/events")
def get_monitoring_events(
    agent_id: Optional[str] = None,
    severity: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    events = MonitoringService.get_events(
        db=db,
        user_id=current_user.id,
        agent_id=agent_id,
        severity=severity,
        event_type=event_type,
        limit=limit
    )
    return [e.to_dict() for e in events]


@router.get("/alerts")
def get_security_alerts(
    agent_id: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    alerts = MonitoringService.get_alerts(
        db=db,
        user_id=current_user.id,
        agent_id=agent_id,
        status=status,
        severity=severity,
        limit=limit
    )
    return [a.to_dict() for a in alerts]


@router.patch("/alerts/{alert_id}")
def update_alert_status(
    alert_id: str,
    update: AlertStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if update.status not in ("active", "acknowledged", "dismissed"):
        raise HTTPException(status_code=400, detail="Invalid status. Must be active, acknowledged, or dismissed.")

    alert = MonitoringService.update_alert_status(
        db=db,
        alert_id=alert_id,
        new_status=update.status,
        user_id=current_user.id
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Security alert not found or unauthorized.")
    return alert.to_dict()


@router.get("/summary")
def get_monitoring_summary(
    agent_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return MonitoringService.get_monitoring_summary(
        db=db,
        user_id=current_user.id,
        agent_id=agent_id
    )
