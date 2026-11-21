from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings

# Normalize postgres:// or postgresql:// connection schemes to postgresql+psycopg2://
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

# Base engine configuration
engine_kwargs = {
    "echo": False,
    "pool_pre_ping": True,
}

if db_url.startswith("sqlite"):
    # SQLite local development configuration
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Production PostgreSQL (Neon serverless / PgBouncer / Cloud Run)
    # Sized for concurrent serverless container instances
    engine_kwargs.update({
        "pool_size": 5,
        "max_overflow": 10,
        "pool_recycle": 1800,
    })

engine = create_engine(db_url, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
