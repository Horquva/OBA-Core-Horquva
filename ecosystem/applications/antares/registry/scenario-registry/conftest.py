"""
Ensures every test run starts from a clean database state, so tests are
reproducible locally, in CI, and when run in any order — no more manual
`rm -f *.db` before every run.

This cleanup MUST happen at conftest module-load time (not inside a
fixture) because pytest loads conftest.py before it imports the test
module in this directory — and the test module's import is what creates
the SQLite engine and calls Base.metadata.create_all(). A fixture (even
session-scoped, autouse) would run after that import already happened,
which is too late.
"""
import glob
import os

for _db_file in glob.glob(os.path.join(os.path.dirname(__file__), "*.db")):
    os.remove(_db_file)
