from backend.app.core.database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        # Check attack_scenarios columns
        cols = [r[1] for r in conn.execute(text("PRAGMA table_info(attack_scenarios)")).fetchall()]
        if "tags" not in cols:
            conn.execute(text("ALTER TABLE attack_scenarios ADD COLUMN tags JSON DEFAULT '[]'"))
        if "version" not in cols:
            conn.execute(text("ALTER TABLE attack_scenarios ADD COLUMN version VARCHAR(20) DEFAULT '1.0.0'"))
        if "evaluation_criteria" not in cols:
            conn.execute(text("ALTER TABLE attack_scenarios ADD COLUMN evaluation_criteria JSON DEFAULT '{}'"))

        # Check test_executions columns
        te_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(test_executions)")).fetchall()]
        if "evaluator_output" not in te_cols:
            conn.execute(text("ALTER TABLE test_executions ADD COLUMN evaluator_output JSON DEFAULT '{}'"))
        if "scenario_version" not in te_cols:
            conn.execute(text("ALTER TABLE test_executions ADD COLUMN scenario_version VARCHAR(20) DEFAULT '1.0.0'"))
        if "is_replay" not in te_cols:
            conn.execute(text("ALTER TABLE test_executions ADD COLUMN is_replay BOOLEAN DEFAULT 0"))
        if "replayed_from_id" not in te_cols:
            conn.execute(text("ALTER TABLE test_executions ADD COLUMN replayed_from_id VARCHAR(36)"))

        # Check security_tests columns
        st_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(security_tests)")).fetchall()]
        if "inconclusive_scenarios" not in st_cols:
            conn.execute(text("ALTER TABLE security_tests ADD COLUMN inconclusive_scenarios INTEGER DEFAULT 0"))
        conn.commit()
    print("Migration check complete.")

if __name__ == "__main__":
    run_migration()
