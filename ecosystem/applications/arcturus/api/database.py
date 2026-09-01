import sqlite3
from pathlib import Path
from contextlib import contextmanager

SCHEMA_PATH = Path(__file__).parent / "database_schema.sql"

def init_database(db_path: Path) -> None:
    """Create tables from existing DDL blueprint if they don't exist."""
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    conn.commit()
    conn.close()

@contextmanager
def get_db_connection(db_path: Path):
    conn = sqlite3.connect(str(db_path), check_same_thread=False, timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

