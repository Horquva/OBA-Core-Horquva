"""
database.py

This sets up the connection to our database. For Day 2 I'm using SQLite
because it needs zero setup and it's enough to prove the persistence layer
actually works. Since I built the models with SQLAlchemy, moving to
Postgres later should just mean changing DATABASE_URL and installing
psycopg2 - the model code shouldn't need to change.

BUGFIX (pre-integration review): every test file set
os.environ.setdefault("TESTING", "1") with a comment saying tests use
"a separate throwaway db so I don't pollute the real one" - but this
file never actually read that env var, so every test run was hitting
the exact same organizational_futures.db file as the dev server and
demo_full_pipeline.py. Now TESTING=1 really does route to a separate
file, matching what the tests already claimed to do.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = (
    "sqlite:///./test_organizational_futures.db"
    if os.environ.get("TESTING") == "1"
    else "sqlite:///./organizational_futures.db"
)

# check_same_thread is only needed for SQLite when used with FastAPI,
# because FastAPI can hit the DB from different threads.
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency. Opens a session for one request and always
    closes it afterwards, even if something goes wrong.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
