"""
Database engine + session setup.

Using SQLite for now (zero setup, good for Day 2 prototyping). Swapping to
Postgres later just means changing DATABASE_URL — no model code changes
needed since we're using SQLAlchemy's ORM layer throughout.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base

DATABASE_URL = "sqlite:///./future_org_engine.db"

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def init_db():
    """Create all tables. Call once at startup / demo run."""
    Base.metadata.create_all(engine)


def get_session():
    return SessionLocal()
