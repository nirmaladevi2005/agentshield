from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.scenario import AttackScenario
from backend.app.schemas.scenario import AttackScenarioCreate, AttackScenarioResponse

router = APIRouter(prefix="/scenarios", tags=["Attack Scenarios"])

@router.get("", response_model=List[AttackScenarioResponse])
def list_scenarios(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(AttackScenario)
    if category and category != "all":
        query = query.filter(AttackScenario.category == category)
    if search:
        query = query.filter(
            (AttackScenario.name.ilike(f"%{search}%")) |
            (AttackScenario.description.ilike(f"%{search}%"))
        )
    return query.order_by(AttackScenario.created_at.desc()).all()

@router.post("", response_model=AttackScenarioResponse, status_code=status.HTTP_201_CREATED)
def create_scenario(
    scenario_in: AttackScenarioCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    valid_categories = [
        "prompt_injection",
        "unauthorized_tool_usage",
        "sensitive_data_exposure",
        "excessive_agency"
    ]
    if scenario_in.category not in valid_categories:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {valid_categories}"
        )

    sc = AttackScenario(
        id=str(uuid.uuid4()),
        category=scenario_in.category,
        subcategory=scenario_in.subcategory,
        name=scenario_in.name,
        description=scenario_in.description,
        test_input=scenario_in.test_input,
        expected_behavior=scenario_in.expected_behavior,
        synthetic_secrets=scenario_in.synthetic_secrets,
        target_tool=scenario_in.target_tool,
        severity=scenario_in.severity,
        tags=scenario_in.tags,
        version=scenario_in.version or "1.0.0",
        evaluation_criteria=scenario_in.evaluation_criteria,
        is_built_in=False,
        created_at=datetime.utcnow()
    )
    db.add(sc)
    db.commit()
    db.refresh(sc)
    return sc

@router.get("/{scenario_id}", response_model=AttackScenarioResponse)
def get_scenario(
    scenario_id: str,
    db: Session = Depends(get_db)
):
    scenario = db.query(AttackScenario).filter(AttackScenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario
