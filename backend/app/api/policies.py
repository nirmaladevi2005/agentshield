from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.agent import Agent
from backend.app.models.intelligence import PolicyRecommendation
from backend.app.schemas.policy import (
    PolicyRecommendationResponse,
    PolicyApplyResponse,
    RetestResponse
)
from backend.app.services.policy_hardening import PolicyHardeningService

router = APIRouter(tags=["Security Policy Hardening"])

@router.get("/agents/{agent_id}/policy-recommendations", response_model=List[PolicyRecommendationResponse])
def get_agent_policy_recommendations(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    agent = db.query(Agent).filter(Agent.id == agent_id, Agent.user_id == current_user.id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found.")

    return db.query(PolicyRecommendation).filter(
        PolicyRecommendation.agent_id == agent_id
    ).order_by(PolicyRecommendation.created_at.desc()).all()

@router.post("/agents/{agent_id}/policy-hardening", response_model=List[PolicyRecommendationResponse])
def generate_agent_policy_hardening(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return PolicyHardeningService.analyze_and_recommend(
        db=db,
        agent_id=agent_id,
        user_id=current_user.id
    )

@router.post("/policy-recommendations/{id}/approve", response_model=PolicyRecommendationResponse)
def approve_policy_recommendation(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Stage A: Review & Approve policy recommendation.
    Does NOT automatically alter runtime agent permissions until applied.
    """
    return PolicyHardeningService.approve_recommendation(
        db=db,
        recommendation_id=id,
        user_id=current_user.id
    )

@router.post("/policy-recommendations/{id}/reject", response_model=PolicyRecommendationResponse)
def reject_policy_recommendation(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Stage A: Review & Reject policy recommendation.
    """
    return PolicyHardeningService.reject_recommendation(
        db=db,
        recommendation_id=id,
        user_id=current_user.id
    )

@router.post("/agents/{agent_id}/apply-policy", response_model=PolicyApplyResponse)
def apply_approved_policies(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Stage B: Explicitly apply all approved policy recommendations to active AgentPermissions.
    Validated and logged in PolicyChangeAudit.
    """
    applied = PolicyHardeningService.apply_approved_policies(
        db=db,
        agent_id=agent_id,
        user_id=current_user.id
    )
    if applied:
        from backend.app.services.monitoring_service import MonitoringService
        MonitoringService.log_event(
            db=db,
            agent_id=agent_id,
            event_type="posture_change",
            severity="info",
            details={
                "applied_count": len(applied),
                "description": f"Applied {len(applied)} approved security policy changes to agent permissions."
            },
            auto_alert=False
        )
    return {
        "agent_id": agent_id,
        "applied_count": len(applied),
        "applied_changes": applied
    }

@router.post("/agents/{agent_id}/retest", response_model=RetestResponse)
def retest_affected_scenarios(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Runs targeted regression tests to verify that applied policy hardening
    neutralized the previously confirmed vulnerabilities.
    """
    return PolicyHardeningService.retest_affected_scenarios(
        db=db,
        agent_id=agent_id,
        user_id=current_user.id
    )
