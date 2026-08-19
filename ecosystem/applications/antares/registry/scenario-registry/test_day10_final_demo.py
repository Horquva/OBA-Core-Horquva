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


def test_final_demo_runs_end_to_end_without_errors(capsys):
    if os.path.exists("./antres_production_knowledge.db"):
        os.remove("./antres_production_knowledge.db")

    import day10_final_demo
    day10_final_demo.run_final_demo()

    captured = capsys.readouterr()
    assert "DEMO COMPLETE" in captured.out
