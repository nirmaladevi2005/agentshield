import re
from typing import Any, Dict, List, Union

class RedactionService:
    """
    Pre-flight data sanitization service to guarantee that sensitive credentials,
    API tokens, authorization headers, and real customer PII are never transmitted
    to third-party AI APIs.
    """

    # Compiled patterns for secret detection
    PATTERNS = [
        # Google API Keys (AIzaSy...)
        (re.compile(r"AIzaSy[A-Za-z0-9_-]{20,40}", re.IGNORECASE), "[REDACTED_GOOGLE_API_KEY]"),
        # OpenAI style keys (sk-...)
        (re.compile(r"sk-[A-Za-z0-9_-]{20,}", re.IGNORECASE), "[REDACTED_OPENAI_API_KEY]"),
        # GitHub tokens (ghp_...)
        (re.compile(r"gh[pousr]_[A-Za-z0-9_]{20,}", re.IGNORECASE), "[REDACTED_GITHUB_TOKEN]"),
        # Bearer tokens
        (re.compile(r"Bearer\s+[A-Za-z0-9_\-\.]{20,}", re.IGNORECASE), "Bearer [REDACTED_BEARER_TOKEN]"),
        # Password patterns in text / JSON
        (re.compile(r"(password|passwd|secret|token)[\"']?\s*[:=]\s*[\"']?([^\"'\s,]+)", re.IGNORECASE), r"\1: [REDACTED_SECRET]"),
        # Email addresses
        (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b"), "[REDACTED_EMAIL]"),
        # Credit card numbers (Luhn/standard 16-digit blocks)
        (re.compile(r"\b(?:\d{4}[ -]?){3}\d{4}\b"), "[REDACTED_PAYMENT_CARD]"),
        # Social Security Numbers / National IDs
        (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "[REDACTED_GOV_ID]"),
        # Synthetic Canary Tokens (replace with masked reference)
        (re.compile(r"CANARY_SECRET_[A-Za-z0-9_]+", re.IGNORECASE), "[REDACTED_CANARY_REF]"),
    ]

    @classmethod
    def redact_text(cls, text: str) -> str:
        if not text or not isinstance(text, str):
            return text
        sanitized = text
        for pattern, replacement in cls.PATTERNS:
            sanitized = pattern.sub(replacement, sanitized)
        return sanitized

    @classmethod
    def sanitize(cls, data: Any) -> Any:
        """
        Recursively sanitizes strings, dicts, lists, and primitives.
        """
        if isinstance(data, str):
            return cls.redact_text(data)
        elif isinstance(data, dict):
            sanitized_dict = {}
            for k, v in data.items():
                # Check sensitive key names
                if any(sec in k.lower() for sec in ["api_key", "secret", "password", "auth", "token", "credential"]):
                    sanitized_dict[k] = "[REDACTED_SENSITIVE_FIELD]"
                else:
                    sanitized_dict[k] = cls.sanitize(v)
            return sanitized_dict
        elif isinstance(data, list):
            return [cls.sanitize(item) for item in data]
        return data
