"""
Automated test wrapper for the Day 10 final demo.
Ensures the full end-to-end demo script runs clean with no assertion
failures or exceptions, so it can be part of the CI/regression suite
instead of only a manually-run script.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "day8"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "day9"))

# DIN7 FIX: removed this wrapper's own os.remove("./antres_production_knowledge.db").
# day10_final_demo.py (imported below) now handles its own reset robustly —
# deleting the file AND disposing/recreating the schema so it works whether this
# runs standalone or after test_part8_production.py / test_day9_integration.py
# in the same pytest session. A second delete here added nothing but risk of
# racing with that logic — see the DIN7 FIX note in day10_final_demo.py itself.


def test_final_demo_runs_end_to_end_without_errors(capsys):
    import day10_final_demo
    day10_final_demo.run_final_demo()

    captured = capsys.readouterr()
    assert "DEMO COMPLETE" in captured.out
