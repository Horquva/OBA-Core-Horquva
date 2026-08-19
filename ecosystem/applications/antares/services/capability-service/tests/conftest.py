"""
Shared pytest fixtures. Each test gets a fresh in-memory SQLite database —
fully isolated from other tests and from the real future_org_engine.db
file, so running the test suite never touches your actual data.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base


@pytest.fixture()
def session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
    s = SessionLocal()
    yield s
    s.close()
