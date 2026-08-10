# =============================================================================
# 🌌 Arcturus Platform — Global Pytest Fixtures Configuration
# Location: ecosystem/applications/arcturus/tests/conftest.py
# =============================================================================

import random
import re

def seed_fixture() -> int:
    """
    Pytest-equivalent fixture that resets Python's pseudo-random number generator
    to reset logical clock determinism. Enforces a baseline seed of 42.
    """
    random.seed(42)
    return 42

def load_codeowners_map(codeowners_path: str = ".github/CODEOWNERS") -> dict:
    """
    Parses the baseline CODEOWNERS file programmatically to support automated
    governance compliance scans. Maps directories to owners.
    """
    ownership_map = {}
    try:
        with open(codeowners_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
        for line in lines:
            line = line.strip()
            # Ignore comments and empty lines
            if not line or line.startswith("#"):
                continue
            
            parts = re.split(r"\s+", line)
            if len(parts) >= 2:
                path = parts[0]
                owners = [owner.strip() for owner in parts[1:] if owner.startswith("@")]
                ownership_map[path] = owners
    except FileNotFoundError:
        # Fallback dictionary for testing if run outside root context
        ownership_map = {
            "/ecosystem/applications/arcturus/src/control_plane/ontology/": ["@MuhammadHamza-7035"]
        }
    return ownership_map
