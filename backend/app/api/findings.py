from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.test_run import SecurityTest
from backend.app.models.finding import VulnerabilityFinding
from backend.app.schemas.finding import (
    VulnerabilityFindingResponse,
    VulnerabilityIntelligenceResponse,
    RemediationPlanResponse
)

router = APIRouter(prefix="/findings", tags=["Vulnerability Findings"])

class FindingStatusUpdate(BaseModel):
    status: str # 'open', 'resolved', 'acknowledged'

@router.get("", response_model=List[VulnerabilityFindingResponse])
def list_findings(
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    finding_status: Optional[str] = Query(None, alias="status"),
    agent_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(VulnerabilityFinding).join(SecurityTest).filter(
        SecurityTest.user_id == current_user.id
    )
    if agent_id:
        query = query.filter(SecurityTest.agent_id == agent_id)
    if category and category != "all":
        query = query.filter(VulnerabilityFinding.category == category)
    if severity and severity != "all":
        query = query.filter(VulnerabilityFinding.severity == severity)
    if finding_status and finding_status != "all":
        query = query.filter(VulnerabilityFinding.status == finding_status)

    return query.order_by(VulnerabilityFinding.created_at.desc()).all()

@router.get("/{finding_id}", response_model=VulnerabilityFindingResponse)
def get_finding(
    finding_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    finding = db.query(VulnerabilityFinding).join(SecurityTest).filter(
        VulnerabilityFinding.id == finding_id,
        SecurityTest.user_id == current_user.id
    ).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding

@router.patch("/{finding_id}/status", response_model=VulnerabilityFindingResponse)
def update_finding_status(
    finding_id: str,
    status_update: FindingStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    finding = db.query(VulnerabilityFinding).join(SecurityTest).filter(
        VulnerabilityFinding.id == finding_id,
        SecurityTest.user_id == current_user.id
    ).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    finding.status = status_update.status
    db.commit()
    db.refresh(finding)
    return finding

@router.post("/{finding_id}/analyze", response_model=VulnerabilityIntelligenceResponse)
def analyze_finding_intelligence(
    finding_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from backend.app.services.vulnerability_intelligence import VulnerabilityIntelligenceService
    return VulnerabilityIntelligenceService.analyze_finding(
        db=db,
        finding_id=finding_id,
        user_id=current_user.id
    )

@router.get("/{finding_id}/intelligence", response_model=VulnerabilityIntelligenceResponse)
def get_finding_intelligence(
    finding_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from backend.app.services.vulnerability_intelligence import VulnerabilityIntelligenceService
    return VulnerabilityIntelligenceService.get_intelligence(
        db=db,
        finding_id=finding_id,
        user_id=current_user.id
    )

@router.post("/{finding_id}/remediation", response_model=RemediationPlanResponse)
def generate_finding_remediation(
    finding_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from backend.app.services.remediation_generator import RemediationGenerator
    return RemediationGenerator.generate_remediation(
        db=db,
        finding_id=finding_id,
        user_id=current_user.id
    )
