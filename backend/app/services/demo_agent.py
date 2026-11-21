import re
import time
import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.services.mock_tools import MockToolEnvironment
from backend.app.services.permission_engine import PermissionEngine, PermissionDecision
from backend.app.models.trace import ExecutionTrace
from backend.app.models.agent import Agent

class DemoCustomerSupportAgent:
    """
    Built-in autonomous customer support demo agent operating within an isolated sandbox.
    Interacts with synthetic data and strictly enforces backend tool policies.
    """

    @classmethod
    def process_message(
        cls,
        db: Session,
        agent: Agent,
        session_id: str,
        user_input: str,
        human_approval_granted: bool = False
    ) -> Dict[str, Any]:
        start_time = time.time()
        tool_calls: List[Dict[str, Any]] = []
        permission_decisions: List[Dict[str, Any]] = []

        # 1. Parse intent & extract tool invocations from user message
        tools_to_run = cls._plan_tool_calls(user_input, human_approval_granted)

        agent_response_parts: List[str] = []

        if not tools_to_run:
            # Direct conversational inquiry
            agent_response = (
                f"Hello! I am {agent.name}. I can assist you with customer inquiries, "
                f"order lookups, status checks, and refund requests within our secure sandbox environment. "
                f"Try asking: 'Look up customer CUST-1001', 'Check status of order ORD-5501', "
                f"or 'Request a refund of $149.99 for order ORD-5501'."
            )
        else:
            for tool_call in tools_to_run:
                tool_name = tool_call["tool_name"]
                args = tool_call["arguments"]

                # 2. Enforce Permissions through Backend Permission Engine
                decision, reason = PermissionEngine.evaluate_tool_permission(
                    db=db,
                    agent_id=agent.id,
                    tool_name=tool_name,
                    arguments=args,
                    human_approved=human_approval_granted
                )

                permission_decisions.append({
                    "tool_name": tool_name,
                    "decision": decision,
                    "reason": reason
                })

                if decision == PermissionDecision.BLOCKED:
                    tool_calls.append({
                        "tool_name": tool_name,
                        "arguments": args,
                        "decision": decision,
                        "reason": reason,
                        "result": None,
                        "status": "blocked"
                    })
                    agent_response_parts.append(
                        f"[Security Policy Intercepted]: Unable to execute `{tool_name}`. {reason}"
                    )
                    try:
                        from backend.app.services.monitoring_service import MonitoringService
                        MonitoringService.log_event(
                            db=db,
                            agent_id=agent.id,
                            event_type="permission_denied",
                            severity="high",
                            details={"tool_name": tool_name, "reason": reason, "arguments": args},
                            auto_alert=False
                        )
                    except Exception:
                        pass

                elif decision == PermissionDecision.REQUIRES_APPROVAL:
                    tool_calls.append({
                        "tool_name": tool_name,
                        "arguments": args,
                        "decision": decision,
                        "reason": reason,
                        "result": None,
                        "status": "approval_required"
                    })
                    agent_response_parts.append(
                        f"⚠️ Action Halted: {reason} "
                        f"(Proposed parameters: {args}). "
                        f"To execute this action, please grant human approval in the sandbox console."
                    )
                    try:
                        from backend.app.services.monitoring_service import MonitoringService
                        MonitoringService.log_event(
                            db=db,
                            agent_id=agent.id,
                            event_type="approval_requested",
                            severity="medium",
                            details={"tool_name": tool_name, "reason": reason, "arguments": args},
                            auto_alert=False
                        )
                    except Exception:
                        pass

                elif decision == PermissionDecision.ALLOWED:
                    # 3. Execute in isolated mock environment
                    result = cls._execute_mock_tool(tool_name, args)
                    tool_calls.append({
                        "tool_name": tool_name,
                        "arguments": args,
                        "decision": decision,
                        "reason": reason,
                        "result": result,
                        "status": "executed"
                    })

                    # Generate contextual response based on tool result
                    if result.get("success"):
                        if tool_name == "get_customer_profile":
                            c = result["customer"]
                            agent_response_parts.append(
                                f"Customer Profile found: {c['name']} ({c['email']}) | "
                                f"Tier: {c['tier']} | Account: {c['account_status']}."
                            )
                        elif tool_name == "get_order_details":
                            o = result["order"]
                            items = ", ".join([f"{i['name']} (x{i['qty']})" for i in o['items']])
                            agent_response_parts.append(
                                f"Order Details for {o['order_id']}: Total ${o['total_amount']} | "
                                f"Status: {o['status']} | Items: {items}."
                            )
                        elif tool_name == "check_order_status":
                            agent_response_parts.append(
                                f"Order {result['order_id']} Status: '{result['status'].upper()}' | "
                                f"Courier: {result['courier']} | Tracking: {result['tracking_number']} | "
                                f"ETA: {result['estimated_delivery']}."
                            )
                        elif tool_name == "request_refund":
                            agent_response_parts.append(
                                f"✅ Refund Processed: Reference {result['refund_id']} for "
                                f"${result['amount_refunded']} on order {result['order_id']}."
                            )
                        elif tool_name == "send_mock_email":
                            agent_response_parts.append(
                                f"✉️ Simulated Email Sent to {result['recipient']}: "
                                f"'{result['subject']}' (Ref: {result['email_id']})."
                            )
                    else:
                        agent_response_parts.append(
                            f"Tool execution failed: {result.get('error', 'Unknown tool error')}"
                        )

            agent_response = "\n\n".join(agent_response_parts)

        execution_time_ms = int((time.time() - start_time) * 1000)

        # 4. Record execution trace in database
        trace = ExecutionTrace(
            id=str(uuid.uuid4()),
            agent_id=agent.id,
            session_id=session_id,
            user_input=user_input,
            agent_response=agent_response,
            tool_calls=tool_calls,
            permission_decisions=permission_decisions,
            execution_time_ms=execution_time_ms
        )
        db.add(trace)
        db.commit()
        db.refresh(trace)

        return {
            "session_id": session_id,
            "agent_response": agent_response,
            "tool_calls": tool_calls,
            "execution_time_ms": execution_time_ms
        }

    @classmethod
    def _plan_tool_calls(cls, text: str, human_approved: bool) -> List[Dict[str, Any]]:
        """Extract tool intentions from natural language prompt."""
        calls = []
        lower = text.lower()

        # 1. Customer profile search
        cust_match = re.search(r"cust-\d{4}", lower)
        if "customer" in lower or "profile" in lower or cust_match:
            cust_id = cust_match.group(0).upper() if cust_match else "CUST-1001"
            calls.append({
                "tool_name": "get_customer_profile",
                "arguments": {"customer_id": cust_id}
            })

        # 2. Refund request (Must check before general order check)
        if "refund" in lower or "return" in lower:
            ord_match = re.search(r"ord-\d{4}", lower)
            amt_match = re.search(r"\$?(\d+(\.\d+)?)", text)
            ord_id = ord_match.group(0).upper() if ord_match else "ORD-5501"
            amount = float(amt_match.group(1)) if amt_match else 149.99
            calls.append({
                "tool_name": "request_refund",
                "arguments": {
                    "order_id": ord_id,
                    "amount": amount,
                    "reason": "Customer requested refund in chat"
                }
            })

        # 3. Order status check
        elif "status" in lower or "track" in lower or "shipment" in lower or "where is" in lower:
            ord_match = re.search(r"ord-\d{4}", lower)
            ord_id = ord_match.group(0).upper() if ord_match else "ORD-5501"
            calls.append({
                "tool_name": "check_order_status",
                "arguments": {"order_id": ord_id}
            })

        # 4. Order details
        elif "order" in lower or "purchase" in lower:
            ord_match = re.search(r"ord-\d{4}", lower)
            ord_id = ord_match.group(0).upper() if ord_match else "ORD-5501"
            calls.append({
                "tool_name": "get_order_details",
                "arguments": {"order_id": ord_id}
            })

        # 5. Email dispatch
        if "email" in lower or "send" in lower:
            email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
            recipient = email_match.group(0) if email_match else "sophia.m@enterprise.io"
            calls.append({
                "tool_name": "send_mock_email",
                "arguments": {
                    "to_address": recipient,
                    "subject": "Customer Support Follow-up",
                    "body": "Thank you for contacting customer support. Your inquiry is being reviewed."
                }
            })

        # 6. Arbitrary / restricted tool commands (e.g. from adversarial testing)
        if "execute_command" in lower or "bash" in lower or "shell" in lower or "cat /" in lower:
            calls.append({
                "tool_name": "execute_command",
                "arguments": {"command": "cat /etc/passwd"}
            })

        if "delete_database" in lower or "drop table" in lower:
            calls.append({
                "tool_name": "delete_database",
                "arguments": {"table": "all_users"}
            })

        return calls

    @staticmethod
    def _execute_mock_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatches to MockToolEnvironment."""
        if tool_name == "get_customer_profile":
            return MockToolEnvironment.get_customer_profile(arguments.get("customer_id", ""))
        elif tool_name == "get_order_details":
            return MockToolEnvironment.get_order_details(arguments.get("order_id", ""))
        elif tool_name == "check_order_status":
            return MockToolEnvironment.check_order_status(arguments.get("order_id", ""))
        elif tool_name == "request_refund":
            return MockToolEnvironment.request_refund(
                order_id=arguments.get("order_id", ""),
                amount=arguments.get("amount", 0.0),
                reason=arguments.get("reason", "")
            )
        elif tool_name == "send_mock_email":
            return MockToolEnvironment.send_mock_email(
                to_address=arguments.get("to_address", ""),
                subject=arguments.get("subject", ""),
                body=arguments.get("body", "")
            )
        else:
            return {"success": False, "error": f"Tool '{tool_name}' not implemented in mock environment."}
