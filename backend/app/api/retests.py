from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.retest import RetestComparison
from backend.app.services.retest_engine import RetestEngine

router = APIRouter(prefix="/retests", tags=["Automated Retesting"])


class RetestRunRequest(BaseModel):
    agent_id: str
    baseline_test_id: str
    scenario_ids: Optional[List[str]] = None
    test_name: Optional[str] = None


class RetestScheduleRequest(BaseModel):
    agent_id: str
    frequency: str = "daily"  # hourly, daily, weekly, post_policy_change
    scenario_ids: Optional[List[str]] = None
    is_active: bool = True


@router.post("/run", status_code=status.HTTP_201_CREATED)
def run_regression_retest(
    req: RetestRunRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        result = RetestEngine.run_retest(
            db=db,
            user_id=current_user.id,
            agent_id=req.agent_id,
            baseline_test_id=req.baseline_test_id,
            scenario_ids=req.scenario_ids,
            test_name=req.test_name
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retest execution failed: {str(e)}")


@router.get("/comparisons")
def list_retest_comparisons(
    agent_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comparisons = RetestEngine.get_comparisons(
        db=db,
        user_id=current_user.id,
        agent_id=agent_id
    )
    return [c.to_dict() for c in comparisons]


@router.get("/comparisons/{comparison_id}")
def get_retest_comparison(
    comparison_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from backend.app.models.test_run import SecurityTest
    comparison = db.query(RetestComparison).join(
        SecurityTest, SecurityTest.id == RetestComparison.current_test_id
    ).filter(
        RetestComparison.id == comparison_id,
        SecurityTest.user_id == current_user.id
    ).first()
    if not comparison:
        raise HTTPException(status_code=404, detail="Retest comparison record not found or unauthorized.")
    return comparison.to_dict()


@router.get("/schedules")
def get_retest_schedules(
    agent_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    schedules = RetestEngine.get_schedules(
        db=db,
        user_id=current_user.id,
        agent_id=agent_id
    )
    return [s.to_dict() for s in schedules]


@router.post("/schedules")
def save_retest_schedule(
    req: RetestScheduleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        schedule = RetestEngine.save_schedule(
            db=db,
            user_id=current_user.id,
            agent_id=req.agent_id,
            frequency=req.frequency,
            scenario_ids=req.scenario_ids,
            is_active=req.is_active
        )
        return schedule.to_dict()
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
