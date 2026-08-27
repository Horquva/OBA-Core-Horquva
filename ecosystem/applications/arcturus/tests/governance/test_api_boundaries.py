import pytest
import textwrap
from pathlib import Path
from ecosystem.applications.arcturus.src.governance.import_boundary_checker import (
    check_forbidden_direct_imports,
)

def test_api_cannot_import_src_internals(tmp_path: Path):
    api_dir = tmp_path / "ecosystem" / "applications" / "arcturus" / "api"
    api_dir.mkdir(parents=True)
    
    bad_file = api_dir / "bad_route.py"
    bad_file.write_text(textwrap.dedent("""\
        from ecosystem.applications.arcturus.src.simulation.runtime_engine import RuntimeEngine
        
        def do_something():
            pass
    """))
    
    result = check_forbidden_direct_imports(tmp_path)
    assert not result.is_compliant
    assert len(result.import_violations) == 1
    assert "ecosystem.applications.arcturus.src.simulation" in result.import_violations[0].import_statement

def test_src_cannot_import_api_internals(tmp_path: Path):
    src_dir = tmp_path / "ecosystem" / "applications" / "arcturus" / "src" / "simulation"
    src_dir.mkdir(parents=True)
    
    bad_file = src_dir / "bad_engine.py"
    bad_file.write_text(textwrap.dedent("""\
        from ecosystem.applications.arcturus.api.database import get_db_connection
        
        def do_something():
            pass
    """))
    
    result = check_forbidden_direct_imports(tmp_path)
    assert not result.is_compliant
    assert len(result.import_violations) == 1
    assert "ecosystem.applications.arcturus.api" in result.import_violations[0].import_statement

def test_api_can_import_contracts(tmp_path: Path):
    api_dir = tmp_path / "ecosystem" / "applications" / "arcturus" / "api"
    api_dir.mkdir(parents=True)
    
    good_file = api_dir / "good_route.py"
    good_file.write_text(textwrap.dedent("""\
        from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
        
        def do_something():
            pass
    """))
    
    result = check_forbidden_direct_imports(tmp_path)
    assert result.is_compliant
