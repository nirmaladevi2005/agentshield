import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Float, ForeignKey, JSON
from backend.app.core.database import Base


class RetestComparison(Base):
    __tablename__ = "retest_comparisons"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    previous_test_id = Column(String(36), ForeignKey("security_tests.id"), nullable=False, index=True)
    current_test_id = Column(String(36), ForeignKey("security_tests.id"), nullable=False, index=True)
    resolved_count = Column(Integer, default=0)
    unresolved_count = Column(Integer, default=0)
    new_issues_count = Column(Integer, default=0)
    score_delta = Column(Float, default=0.0)
    comparison_summary = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "previous_test_id": self.previous_test_id,
            "current_test_id": self.current_test_id,
            "resolved_count": self.resolved_count,
            "unresolved_count": self.unresolved_count,
            "new_issues_count": self.new_issues_count,
            "score_delta": self.score_delta,
            "comparison_summary": self.comparison_summary or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
