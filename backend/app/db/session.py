from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

connect_args = {}
engine_kwargs = {}

if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
else:
    # MySQL / MariaDB connection tuning
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_recycle": 3600,
        "pool_size": 10,
        "max_overflow": 20
    })

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency that provides an independent SQLAlchemy session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
