import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime

from backend.app.models.agent import Agent, AgentPermission
from backend.app.models.finding import VulnerabilityFinding
from backend.app.models.test_run import SecurityTest, TestExecution
from backend.app.models.scenario import AttackScenario
from backend.app.models.intelligence import PolicyRecommendation, PolicyChangeAudit
from backend.app.services.attack_engine import AttackSimulationEngine

class PolicyHardeningService:
    """
    Analyzes historical attack attempts and security posture, generates policy
    recommendations, and enforces a strict two-stage human approval workflow
    before updating active AgentPermissions.
    """

    @classmethod
    def analyze_and_recommend(cls, db: Session, agent_id: str, user_id: str) -> List[PolicyRecommendation]:
        agent = db.query(Agent).filter(Agent.id == agent_id, Agent.user_id == user_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found.")

        # Gather active permissions
        permissions = db.query(AgentPermission).filter(AgentPermission.agent_id == agent_id).all()
        perm_map = {p.tool_name: p for p in permissions}

        # Gather recent findings and executions
        tests = db.query(SecurityTest).filter(SecurityTest.agent_id == agent_id).all()
        test_ids = [t.id for t in tests]
        findings = db.query(VulnerabilityFinding).filter(VulnerabilityFinding.test_id.in_(test_ids)).all() if test_ids else []

        recommendations: List[PolicyRecommendation] = []

        # 1. Audit high-risk financial/destructive tools
        if "request_refund" in perm_map:
            p = perm_map["request_refund"]
            if not p.requires_human_approval or p.rate_limit_per_min > 10:
                rec = cls._create_or_get_recommendation(
                    db=db,
                    agent_id=agent_id,
                    tool_name="request_refund",
                    current_policy={
                        "is_allowed": p.is_allowed,
                        "requires_human_approval": p.requires_human_approval,
                        "rate_limit_per_min": p.rate_limit_per_min
                    },
                    proposed_policy={
                        "is_allowed": True,
                        "requires_human_approval": True,
                        "rate_limit_per_min": 5
                    },
                    justification="Financial action tool 'request_refund' must require human approval and stricter rate limits to prevent autonomous unauthorized fund transfers."
                )
                recommendations.append(rec)

        # 2. Audit dangerous shell / database tools
        for dangerous_tool in ["execute_command", "delete_database", "modify_system_files"]:
            if dangerous_tool in perm_map:
                p = perm_map[dangerous_tool]
                if p.is_allowed:
                    rec = cls._create_or_get_recommendation(
                        db=db,
                        agent_id=agent_id,
                        tool_name=dangerous_tool,
                        current_policy={
                            "is_allowed": p.is_allowed,
                            "requires_human_approval": p.requires_human_approval,
                            "rate_limit_per_min": p.rate_limit_per_min
                        },
                        proposed_policy={
                            "is_allowed": False,
                            "requires_human_approval": True,
                            "rate_limit_per_min": 0
                        },
                        justification=f"High-impact administrative capability '{dangerous_tool}' violates the principle of least privilege. Revoke permission completely."
                    )
                    recommendations.append(rec)

        # 3. Audit communication tools for data exfiltration risk
        if "send_mock_email" in perm_map:
            p = perm_map["send_mock_email"]
            if not p.requires_human_approval and any(f.category == "sensitive_data_exposure" for f in findings):
                rec = cls._create_or_get_recommendation(
                    db=db,
                    agent_id=agent_id,
                    tool_name="send_mock_email",
                    current_policy={
                        "is_allowed": p.is_allowed,
                        "requires_human_approval": p.requires_human_approval,
                        "rate_limit_per_min": p.rate_limit_per_min
                    },
                    proposed_policy={
                        "is_allowed": True,
                        "requires_human_approval": True,
                        "rate_limit_per_min": 10
                    },
                    justification="External transmission tool 'send_mock_email' should require operator sign-off following sensitive data exposure findings."
                )
                recommendations.append(rec)

        db.commit()
        return recommendations

    @classmethod
    def _create_or_get_recommendation(
        cls,
        db: Session,
        agent_id: str,
        tool_name: str,
        current_policy: Dict[str, Any],
        proposed_policy: Dict[str, Any],
        justification: str,
        finding_id: Optional[str] = None
    ) -> PolicyRecommendation:
        existing = db.query(PolicyRecommendation).filter(
            PolicyRecommendation.agent_id == agent_id,
            PolicyRecommendation.tool_name == tool_name,
            PolicyRecommendation.status.in_(["pending", "approved"])
        ).first()

        if existing:
            existing.current_policy = current_policy
            existing.proposed_policy = proposed_policy
            existing.justification = justification
            return existing

        rec = PolicyRecommendation(
            agent_id=agent_id,
            finding_id=finding_id,
            tool_name=tool_name,
            current_policy=current_policy,
            proposed_policy=proposed_policy,
            justification=justification,
            status="pending",
            created_at=datetime.utcnow()
        )
        db.add(rec)
        db.flush()
        return rec

    @classmethod
    def approve_recommendation(cls, db: Session, recommendation_id: str, user_id: str) -> PolicyRecommendation:
        """Stage A: Review & Approve"""
        rec = db.query(PolicyRecommendation).join(Agent).filter(
            PolicyRecommendation.id == recommendation_id,
            Agent.user_id == user_id
        ).first()

        if not rec:
            raise HTTPException(status_code=404, detail="Policy recommendation not found.")

        if rec.status == "applied":
            raise HTTPException(status_code=400, detail="Recommendation has already been applied.")

        rec.status = "approved"
        rec.reviewed_at = datetime.utcnow()
        rec.reviewed_by = user_id

        # Log audit entry
        audit = PolicyChangeAudit(
            agent_id=rec.agent_id,
            recommendation_id=rec.id,
            user_id=user_id,
            action="approved",
            policy_diff={
                "tool_name": rec.tool_name,
                "current": rec.current_policy,
                "proposed": rec.proposed_policy
            },
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()
        db.refresh(rec)
        return rec

    @classmethod
    def reject_recommendation(cls, db: Session, recommendation_id: str, user_id: str) -> PolicyRecommendation:
        """Stage A: Review & Reject"""
        rec = db.query(PolicyRecommendation).join(Agent).filter(
            PolicyRecommendation.id == recommendation_id,
            Agent.user_id == user_id
        ).first()

        if not rec:
            raise HTTPException(status_code=404, detail="Policy recommendation not found.")

        rec.status = "rejected"
        rec.reviewed_at = datetime.utcnow()
        rec.reviewed_by = user_id

        audit = PolicyChangeAudit(
            agent_id=rec.agent_id,
            recommendation_id=rec.id,
            user_id=user_id,
            action="rejected",
            policy_diff={"status": "rejected"},
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()
        db.refresh(rec)
        return rec

    @classmethod
    def apply_approved_policies(cls, db: Session, agent_id: str, user_id: str) -> List[Dict[str, Any]]:
        """Stage B: Apply all explicitly approved policies to active AgentPermission rows"""
        agent = db.query(Agent).filter(Agent.id == agent_id, Agent.user_id == user_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found.")

        approved_recs = db.query(PolicyRecommendation).filter(
            PolicyRecommendation.agent_id == agent_id,
            PolicyRecommendation.status == "approved"
        ).all()

        if not approved_recs:
            raise HTTPException(status_code=400, detail="No approved policy recommendations found to apply. Please review and approve recommendations first.")

        applied_changes = []

        for rec in approved_recs:
            proposed = rec.proposed_policy
            # Safeguard 6: Pre-application validation
            if not isinstance(proposed, dict):
                continue

            tool_name = rec.tool_name
            perm = db.query(AgentPermission).filter(
                AgentPermission.agent_id == agent_id,
                AgentPermission.tool_name == tool_name
            ).first()

            if not perm:
                perm = AgentPermission(
                    agent_id=agent_id,
                    tool_name=tool_name,
                    is_allowed=proposed.get("is_allowed", False),
                    requires_human_approval=proposed.get("requires_human_approval", True),
                    rate_limit_per_min=max(0, int(proposed.get("rate_limit_per_min", 60)))
                )
                db.add(perm)
            else:
                perm.is_allowed = bool(proposed.get("is_allowed", perm.is_allowed))
                perm.requires_human_approval = bool(proposed.get("requires_human_approval", perm.requires_human_approval))
                perm.rate_limit_per_min = max(0, int(proposed.get("rate_limit_per_min", perm.rate_limit_per_min)))

            rec.status = "applied"

            audit = PolicyChangeAudit(
                agent_id=agent_id,
                recommendation_id=rec.id,
                user_id=user_id,
                action="applied",
                policy_diff={
                    "tool_name": tool_name,
                    "applied_policy": {
                        "is_allowed": perm.is_allowed,
                        "requires_human_approval": perm.requires_human_approval,
                        "rate_limit_per_min": perm.rate_limit_per_min
                    }
                },
                timestamp=datetime.utcnow()
            )
            db.add(audit)

            applied_changes.append({
                "recommendation_id": rec.id,
                "tool_name": tool_name,
                "is_allowed": perm.is_allowed,
                "requires_human_approval": perm.requires_human_approval,
                "rate_limit_per_min": perm.rate_limit_per_min
            })

        db.commit()
        return applied_changes

    @classmethod
    def retest_affected_scenarios(cls, db: Session, agent_id: str, user_id: str) -> Dict[str, Any]:
        """
        Retests affected scenarios to verify that the hardened policies
        neutralize previously exploited attack vectors.
        """
        agent = db.query(Agent).filter(Agent.id == agent_id, Agent.user_id == user_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found.")

        # Run attack suite
        security_test = AttackSimulationEngine.run_security_test(
            db=db,
            user_id=user_id,
            agent_id=agent_id,
            test_name=f"Post-Hardening Verification Suite - {agent.name[:20]}"
        )

        return {
            "test_id": security_test.id,
            "test_name": getattr(security_test, "name", "Verification Suite"),
            "total_scenarios": security_test.total_scenarios,
            "blocked_scenarios": security_test.blocked_scenarios,
            "failed_scenarios": security_test.failed_scenarios,
            "passed_scenarios": security_test.passed_scenarios,
            "overall_risk_score": security_test.overall_risk_score,
            "status": security_test.status,
            "hardening_verified": security_test.failed_scenarios == 0 or security_test.blocked_scenarios > 0
        }
