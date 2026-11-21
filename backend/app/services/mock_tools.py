import re
import uuid
from typing import Dict, Any, Optional

# Synthetic Datasets
SYNTHETIC_CUSTOMERS = {
    "CUST-1001": {
        "customer_id": "CUST-1001",
        "name": "Sophia Martinez",
        "email": "sophia.m@enterprise.io",
        "tier": "Enterprise",
        "account_status": "Active",
        "registered_date": "2024-03-15",
        "notes": "Prefers priority support."
    },
    "CUST-1002": {
        "customer_id": "CUST-1002",
        "name": "David Chen",
        "email": "david.c@techcorp.com",
        "tier": "Standard",
        "account_status": "Active",
        "registered_date": "2024-07-22",
        "notes": "Standard customer."
    },
    "CUST-1003": {
        "customer_id": "CUST-1003",
        "name": "Elena Rostova",
        "email": "elena.r@quantum.ai",
        "tier": "VIP",
        "account_status": "Active",
        "registered_date": "2023-11-04",
        "notes": "Executive account holder."
    }
}

SYNTHETIC_ORDERS = {
    "ORD-5501": {
        "order_id": "ORD-5501",
        "customer_id": "CUST-1001",
        "total_amount": 149.99,
        "currency": "USD",
        "status": "delivered",
        "order_date": "2026-11-01",
        "items": [
            {"sku": "SKU-992", "name": "AI Edge Neural Dev Kit", "qty": 1, "unit_price": 149.99}
        ]
    },
    "ORD-5502": {
        "order_id": "ORD-5502",
        "customer_id": "CUST-1002",
        "total_amount": 899.00,
        "currency": "USD",
        "status": "in_transit",
        "order_date": "2026-11-03",
        "items": [
            {"sku": "SKU-441", "name": "Enterprise GPU Server Blade", "qty": 1, "unit_price": 899.00}
        ]
    },
    "ORD-5503": {
        "order_id": "ORD-5503",
        "customer_id": "CUST-1003",
        "total_amount": 45.50,
        "currency": "USD",
        "status": "processing",
        "order_date": "2026-11-05",
        "items": [
            {"sku": "SKU-108", "name": "Cyber Defense Architecture Handbook", "qty": 1, "unit_price": 45.50}
        ]
    }
}

class MockToolEnvironment:
    """Isolated mock tool execution environment using synthetic data."""

    @staticmethod
    def get_customer_profile(customer_id: str) -> Dict[str, Any]:
        """Retrieve synthetic customer profile."""
        if not re.match(r"^CUST-\d{4}$", customer_id.strip()):
            return {
                "success": False,
                "error": "Invalid customer_id format. Expected pattern: CUST-XXXX"
            }
        
        customer = SYNTHETIC_CUSTOMERS.get(customer_id.strip())
        if not customer:
            return {
                "success": False,
                "error": f"Customer '{customer_id}' not found in synthetic database."
            }
        return {"success": True, "customer": customer}

    @staticmethod
    def get_order_details(order_id: str) -> Dict[str, Any]:
        """Retrieve synthetic order details."""
        if not re.match(r"^ORD-\d{4}$", order_id.strip()):
            return {
                "success": False,
                "error": "Invalid order_id format. Expected pattern: ORD-XXXX"
            }
        
        order = SYNTHETIC_ORDERS.get(order_id.strip())
        if not order:
            return {
                "success": False,
                "error": f"Order '{order_id}' not found in synthetic database."
            }
        return {"success": True, "order": order}

    @staticmethod
    def check_order_status(order_id: str) -> Dict[str, Any]:
        """Check status and tracking for an order."""
        if not re.match(r"^ORD-\d{4}$", order_id.strip()):
            return {
                "success": False,
                "error": "Invalid order_id format. Expected pattern: ORD-XXXX"
            }
        
        order = SYNTHETIC_ORDERS.get(order_id.strip())
        if not order:
            return {
                "success": False,
                "error": f"Order '{order_id}' not found in synthetic database."
            }
        
        return {
            "success": True,
            "order_id": order_id,
            "status": order["status"],
            "courier": "FedEx Secure Freight",
            "tracking_number": f"TRK-{abs(hash(order_id)) % 1000000:06d}",
            "estimated_delivery": "2026-11-09"
        }

    @staticmethod
    def request_refund(order_id: str, amount: float, reason: str) -> Dict[str, Any]:
        """Process a simulated refund. (Sensitive financial write operation)."""
        if not re.match(r"^ORD-\d{4}$", order_id.strip()):
            return {"success": False, "error": "Invalid order_id format."}
        if amount <= 0:
            return {"success": False, "error": "Refund amount must be strictly greater than 0."}
        if not reason or len(reason.strip()) < 3:
            return {"success": False, "error": "A valid reason of at least 3 characters is required."}

        refund_ref = f"REF-{uuid.uuid4().hex[:8].upper()}"
        return {
            "success": True,
            "refund_id": refund_ref,
            "order_id": order_id,
            "amount_refunded": amount,
            "currency": "USD",
            "reason": reason,
            "status": "simulated_refund_processed",
            "simulated": True
        }

    @staticmethod
    def send_mock_email(to_address: str, subject: str, body: str) -> Dict[str, Any]:
        """Create a simulated email record without external network calls."""
        email_regex = r"^[\w\.-]+@[\w\.-]+\.\w+$"
        if not re.match(email_regex, to_address.strip()):
            return {"success": False, "error": "Invalid email address format."}
        if not subject.strip():
            return {"success": False, "error": "Subject cannot be empty."}

        email_id = f"EML-{uuid.uuid4().hex[:8].upper()}"
        return {
            "success": True,
            "email_id": email_id,
            "recipient": to_address.strip(),
            "subject": subject.strip(),
            "body_snippet": body[:80] + "..." if len(body) > 80 else body,
            "status": "simulated_dispatch_recorded",
            "network_call": False
        }
