from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.test_run import SecurityTest, TestExecution
from backend.app.schemas.test import SecurityTestResponse, TestExecuteRequest, TestExecutionResponse
from backend.app.services.attack_engine import AttackSimulationEngine

router = APIRouter(prefix="/tests", tags=["Security Tests"])

@router.get("", response_model=List[SecurityTestResponse])
def list_security_tests(
    agent_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(SecurityTest).filter(SecurityTest.user_id == current_user.id)
    if agent_id:
        query = query.filter(SecurityTest.agent_id == agent_id)
    return query.order_by(SecurityTest.created_at.desc()).all()

@router.post("/run", response_model=SecurityTestResponse, status_code=status.HTTP_201_CREATED)
def start_security_test(
    req: TestExecuteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        test = AttackSimulationEngine.run_security_test(
            db=db,
            user_id=current_user.id,
            agent_id=req.agent_id,
            scenario_ids=req.scenario_ids,
            categories=req.categories,
            test_name=req.test_name
        )
        return test
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Attack simulation error: {str(e)}")

@router.get("/{test_id}", response_model=SecurityTestResponse)
def get_security_test(
    test_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    test = db.query(SecurityTest).filter(
        SecurityTest.id == test_id,
        SecurityTest.user_id == current_user.id
    ).first()
    if not test:
        raise HTTPException(status_code=404, detail="Security test not found")
    return test

@router.post("/{test_id}/replay/{execution_id}", response_model=TestExecutionResponse)
def replay_execution(
    test_id: str,
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        replay_exec = AttackSimulationEngine.replay_execution(
            db=db,
            user_id=current_user.id,
            test_id=test_id,
            execution_id=execution_id
        )
        return replay_exec
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Replay execution error: {str(e)}")
