import os
import sys

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from backend.app.core.database import engine, Base
import backend.app.models

def run_migration():
    print("Running Phase 4 database migration...")
    Base.metadata.create_all(bind=engine)
    print("Phase 4 database tables verified and created successfully.")

if __name__ == "__main__":
    run_migration()
