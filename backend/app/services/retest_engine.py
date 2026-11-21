import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.models.agent import Agent
from backend.app.models.test_run import SecurityTest, TestExecution
from backend.app.models.finding import VulnerabilityFinding
from backend.app.models.retest import RetestComparison
from backend.app.models.monitoring import RetestSchedule
from backend.app.services.attack_engine import AttackSimulationEngine
from backend.app.services.monitoring_service import MonitoringService


class RetestEngine:
    """
    Automated regression retesting and differential security evaluator.
    Compares historical baseline security test runs with current retest executions,
    identifying fixed vulnerabilities, unresolved issues, and security regressions.
    """

    @classmethod
    def run_retest(
        cls,
        db: Session,
        user_id: str,
        agent_id: str,
        baseline_test_id: str,
        scenario_ids: Optional[List[str]] = None,
        test_name: Optional[str] = None
    ) -> Dict[str, Any]:
        agent = db.query(Agent).filter(Agent.id == agent_id, Agent.user_id == user_id).first()
        if not agent:
            raise ValueError(f"Agent '{agent_id}' not found or unauthorized.")

        baseline_test = db.query(SecurityTest).filter(
            SecurityTest.id == baseline_test_id,
            SecurityTest.user_id == user_id
        ).first()
        if not baseline_test:
            raise ValueError(f"Baseline security test '{baseline_test_id}' not found.")

        # Determine target scenarios for regression testing
        target_scenario_ids = scenario_ids
        if not target_scenario_ids:
            baseline_executions = db.query(TestExecution).filter(
                TestExecution.test_id == baseline_test_id
            ).all()
            if baseline_executions:
                target_scenario_ids = [e.scenario_id for e in baseline_executions]
            else:
                # Fallback to all baseline findings or default scenarios
                findings = db.query(VulnerabilityFinding).filter(
                    VulnerabilityFinding.test_id == baseline_test_id
                ).all()
                target_scenario_ids = [f.scenario_id for f in findings if f.scenario_id]

        if not target_scenario_ids:
            raise ValueError("No scenarios available to retest from the baseline run.")

        # Execute current security test
        retest_name = test_name or f"Retest vs. {baseline_test.name[:25]} ({datetime.utcnow().strftime('%b %d, %H:%M')})"
        current_test = AttackSimulationEngine.run_security_test(
            db=db,
            user_id=user_id,
            agent_id=agent_id,
            scenario_ids=target_scenario_ids,
            test_name=retest_name
        )

        # Perform differential comparison
        comparison = cls.compare_test_runs(
            db=db,
            baseline_test_id=baseline_test.id,
            current_test_id=current_test.id
        )

        return {
            "comparison": comparison.to_dict(),
            "baseline_test": {
                "id": baseline_test.id,
                "name": baseline_test.name,
                "risk_score": baseline_test.overall_risk_score,
                "created_at": baseline_test.created_at.isoformat() if baseline_test.created_at else None,
            },
            "current_test": {
                "id": current_test.id,
                "name": current_test.name,
                "risk_score": current_test.overall_risk_score,
                "created_at": current_test.created_at.isoformat() if current_test.created_at else None,
            }
        }

    @classmethod
    def compare_test_runs(
        cls,
        db: Session,
        baseline_test_id: str,
        current_test_id: str
    ) -> RetestComparison:
        """
        Calculates differential comparison between two test runs:
        - fixed: vulnerability in baseline is now safely blocked or passed.
        - unresolved: vulnerability in baseline remains vulnerable.
        - regressed: scenario that was safe/blocked in baseline is now exploited.
        - inconclusive: scenario evaluation is inconclusive.
        """
        baseline_test = db.query(SecurityTest).filter(SecurityTest.id == baseline_test_id).first()
        current_test = db.query(SecurityTest).filter(SecurityTest.id == current_test_id).first()

        if not baseline_test or not current_test:
            raise ValueError("Both baseline and current tests must exist for comparison.")

        baseline_execs = {
            e.scenario_id: e for e in db.query(TestExecution).filter(TestExecution.test_id == baseline_test_id).all()
        }
        current_execs = {
            e.scenario_id: e for e in db.query(TestExecution).filter(TestExecution.test_id == current_test_id).all()
        }

        fixed_findings = []
        unresolved_findings = []
        regressed_findings = []
        inconclusive_findings = []

        all_scenario_ids = set(baseline_execs.keys()).union(set(current_execs.keys()))

        for sc_id in all_scenario_ids:
            b_exec = baseline_execs.get(sc_id)
            c_exec = current_execs.get(sc_id)

            if not b_exec or not c_exec:
                inconclusive_findings.append({
                    "scenario_id": sc_id,
                    "reason": "Scenario was not executed in both test runs",
                    "status": "inconclusive"
                })
                continue

            # Deterministic vulnerability check: result == "vulnerable" or attack_succeeded or failed
            b_vuln = bool(b_exec.result == "vulnerable" or getattr(b_exec, "attack_succeeded", False) or getattr(b_exec, "test_status", "") == "failed")
            c_vuln = bool(c_exec.result == "vulnerable" or getattr(c_exec, "attack_succeeded", False) or getattr(c_exec, "test_status", "") == "failed")

            scenario_info = {
                "scenario_id": sc_id,
                "scenario_name": getattr(c_exec.scenario, "name", sc_id) if c_exec.scenario else sc_id,
                "category": getattr(c_exec.scenario, "category", "unknown") if c_exec.scenario else "unknown",
                "baseline_status": getattr(b_exec, "result", "unknown"),
                "current_status": getattr(c_exec, "result", "unknown"),
                "control_effective": getattr(c_exec, "result", "") in ("blocked", "passed"),
            }

            if b_vuln and not c_vuln:
                scenario_info["classification"] = "fixed"
                fixed_findings.append(scenario_info)
            elif b_vuln and c_vuln:
                scenario_info["classification"] = "unresolved"
                unresolved_findings.append(scenario_info)
            elif not b_vuln and c_vuln:
                scenario_info["classification"] = "regressed"
                regressed_findings.append(scenario_info)
            else:
                scenario_info["classification"] = "retained_secure"
                # Consistently secure

        # Score delta (positive indicates improvement, negative indicates degradation)
        score_delta = round((baseline_test.overall_risk_score or 0.0) - (current_test.overall_risk_score or 0.0), 2)

        comparison_summary = {
            "fixed_findings": fixed_findings,
            "unresolved_findings": unresolved_findings,
            "regressed_findings": regressed_findings,
            "inconclusive_findings": inconclusive_findings,
            "total_scenarios_compared": len(all_scenario_ids),
            "baseline_score": baseline_test.overall_risk_score,
            "current_score": current_test.overall_risk_score,
            "score_delta": score_delta
        }

        comparison = RetestComparison(
            previous_test_id=baseline_test_id,
            current_test_id=current_test_id,
            resolved_count=len(fixed_findings),
            unresolved_count=len(unresolved_findings),
            new_issues_count=len(regressed_findings),
            score_delta=score_delta,
            comparison_summary=comparison_summary,
            created_at=datetime.utcnow()
        )
        db.add(comparison)
        db.commit()
        db.refresh(comparison)

        # Trigger monitoring events and alerts
        agent_id = current_test.agent_id
        if regressed_findings:
            MonitoringService.log_event(
                db=db,
                agent_id=agent_id,
                event_type="retest_regression",
                severity="critical",
                details={
                    "retest_id": current_test.id,
                    "baseline_id": baseline_test.id,
                    "regressions": regressed_findings,
                    "description": f"Automated retest detected {len(regressed_findings)} security regression(s)!"
                },
                auto_alert=True
            )
        else:
            MonitoringService.log_event(
                db=db,
                agent_id=agent_id,
                event_type="posture_change",
                severity="info",
                details={
                    "retest_id": current_test.id,
                    "baseline_id": baseline_test.id,
                    "fixed_count": len(fixed_findings),
                    "unresolved_count": len(unresolved_findings),
                    "score_delta": score_delta,
                    "description": f"Retest completed: {len(fixed_findings)} resolved, {len(unresolved_findings)} unresolved."
                },
                auto_alert=False
            )

        return comparison

    @classmethod
    def get_comparisons(
        cls,
        db: Session,
        user_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        limit: int = 50
    ) -> List[RetestComparison]:
        query = db.query(RetestComparison)
        if user_id or agent_id:
            query = query.join(SecurityTest, SecurityTest.id == RetestComparison.current_test_id)
            if user_id:
                query = query.filter(SecurityTest.user_id == user_id)
            if agent_id:
                query = query.filter(SecurityTest.agent_id == agent_id)
        return query.order_by(desc(RetestComparison.created_at)).limit(limit).all()

    @classmethod
    def save_schedule(
        cls,
        db: Session,
        agent_id: str,
        user_id: Optional[str] = None,
        frequency: str = "daily",
        scenario_ids: Optional[List[str]] = None,
        is_active: bool = True
    ) -> RetestSchedule:
        if user_id:
            agent = db.query(Agent).filter(Agent.id == agent_id, Agent.user_id == user_id).first()
            if not agent:
                raise ValueError(f"Agent '{agent_id}' not found or unauthorized.")
        else:
            agent = db.query(Agent).filter(Agent.id == agent_id).first()
            if not agent:
                raise ValueError(f"Agent '{agent_id}' not found.")

        existing = db.query(RetestSchedule).filter(RetestSchedule.agent_id == agent_id).first()
        if existing:
            existing.frequency = frequency
            existing.scenario_ids = scenario_ids or []
            existing.is_active = is_active
            db.commit()
            db.refresh(existing)
            return existing

        schedule = RetestSchedule(
            agent_id=agent_id,
            frequency=frequency,
            scenario_ids=scenario_ids or [],
            is_active=is_active,
            created_at=datetime.utcnow()
        )
        db.add(schedule)
        db.commit()
        db.refresh(schedule)
        return schedule

    @classmethod
    def get_schedules(
        cls,
        db: Session,
        user_id: Optional[str] = None,
        agent_id: Optional[str] = None
    ) -> List[RetestSchedule]:
        query = db.query(RetestSchedule)
        if user_id:
            query = query.join(Agent, Agent.id == RetestSchedule.agent_id).filter(Agent.user_id == user_id)
        if agent_id:
            query = query.filter(RetestSchedule.agent_id == agent_id)
        return query.all()
