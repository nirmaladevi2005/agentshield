from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from backend.app.models.agent import AgentPermission

class PermissionDecision:
    ALLOWED = "allowed"
    BLOCKED = "blocked"
    REQUIRES_APPROVAL = "requires_approval"

class PermissionEngine:
    @staticmethod
    def evaluate_tool_permission(
        db: Session,
        agent_id: str,
        tool_name: str,
        arguments: Dict[str, Any],
        human_approved: bool = False
    ) -> Tuple[str, str]:
        """
        Evaluates tool permission against the agent's policy in the database.
        Returns: (decision, reason)
        Default: Deny sensitive tools unless explicitly allowed.
        """
        perm = db.query(AgentPermission).filter(
            AgentPermission.agent_id == agent_id,
            AgentPermission.tool_name == tool_name
        ).first()

        # 1. Deny by default if tool is not registered
        if not perm:
            return (
                PermissionDecision.BLOCKED,
                f"Security Deny-by-Default: Tool '{tool_name}' is not in the agent's policy allowlist."
            )

        # 2. Deny if explicitly marked as not allowed
        if not perm.is_allowed:
            return (
                PermissionDecision.BLOCKED,
                f"Policy Violation: Tool '{tool_name}' is restricted by agent security policy."
            )

        # 3. Check human approval requirement
        if perm.requires_human_approval and not human_approved:
            return (
                PermissionDecision.REQUIRES_APPROVAL,
                f"Human-in-the-Loop Gate: Tool '{tool_name}' performs high-impact operations and requires explicit human authorization."
            )

        # 4. Check argument constraints
        constraints = perm.argument_constraints or {}
        if tool_name == "request_refund" and "max_amount" in constraints:
            max_amt = constraints["max_amount"]
            amt = arguments.get("amount", 0)
            if amt > max_amt:
                return (
                    PermissionDecision.BLOCKED,
                    f"Argument Constraint Violation: Refund amount ${amt} exceeds policy limit of ${max_amt}."
                )

        if tool_name == "send_mock_email" and "allowed_domains" in constraints:
            allowed_domains = constraints["allowed_domains"]
            recipient = arguments.get("to_address", "")
            domain = recipient.split("@")[-1] if "@" in recipient else ""
            if domain not in allowed_domains:
                return (
                    PermissionDecision.BLOCKED,
                    f"Domain Constraint Violation: Recipient domain '{domain}' is not in allowed domains list {allowed_domains}."
                )

        return (PermissionDecision.ALLOWED, f"Execution permitted under active policy for '{tool_name}'.")
