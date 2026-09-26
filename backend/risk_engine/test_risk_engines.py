"""
OBA Core — Scientific Parity & Mathematical Verification Test Suite
===================================================================
Asserts exact numerical equivalence between Python reference models
(pgmpy / scipy) and production JavaScript implementations (bayes.js / eirwr.js).
"""

import sys
import subprocess
import json
import numpy as np

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from bbn_model import build_bbn_model, build_cpt_tensor, score_agent, CPT_COEFFS
from eirwr_model import EIRWREngine

def test_bbn_anchors_and_axioms():
    print("\n--- Testing Python BBN Axioms & Empirical Anchors ---")
    tensor = build_cpt_tensor()
    assert tensor.shape == (3, 81), f"Unexpected tensor shape {tensor.shape}"

    # Axiom: Non-negativity
    assert np.all(tensor >= 0), "Negative probability found in CPT tensor"

    # Axiom: Column stochasticity
    col_sums = tensor.sum(axis=0)
    max_sum_err = float(np.max(np.abs(col_sums - 1.0)))
    assert max_sum_err < 1e-12, f"Column stochasticity violated: max error {max_sum_err}"
    print(f"  ✓ All 81 CPT columns sum to 1.0 (max error {max_sum_err:.2e})")

    # Anchor (2,2,2,2) -> Floor risk
    res_2222 = score_agent(2, 2, 2, 2, tensor)
    assert abs(res_2222['pNominal'] - 0.96) < 1e-3, f"Anchor (2,2,2,2) P(N) expected ~0.96, got {res_2222['pNominal']}"
    assert abs(res_2222['pElevated'] - 0.035) < 1e-3, f"Anchor (2,2,2,2) P(E) expected ~0.035, got {res_2222['pElevated']}"
    assert abs(res_2222['pCritical'] - 0.005) < 1e-3, f"Anchor (2,2,2,2) P(C) expected ~0.005, got {res_2222['pCritical']}"
    assert res_2222['predictedScore'] == 2, f"Anchor (2,2,2,2) score expected 2, got {res_2222['predictedScore']}"
    assert res_2222['threatLevel'] == 'LOW'
    print("  ✓ Anchor (2,2,2,2) matches floor risk: score 2, P(C)=0.005, threat LOW")

    # Anchor (0,0,0,0) -> Catastrophic risk
    res_0000 = score_agent(0, 0, 0, 0, tensor)
    assert abs(res_0000['pCritical'] - 0.99) < 1e-3, f"Anchor (0,0,0,0) P(C) expected ~0.99, got {res_0000['pCritical']}"
    assert res_0000['predictedScore'] == 99, f"Anchor (0,0,0,0) score expected 99, got {res_0000['predictedScore']}"
    assert res_0000['threatLevel'] == 'CRITICAL'
    print("  ✓ Anchor (0,0,0,0) matches catastrophic risk: score 99, P(C)=0.99, threat CRITICAL")

    # Anchor (0,2,2,2) -> Unowned, documented
    res_0222 = score_agent(0, 2, 2, 2, tensor)
    assert abs(res_0222['pCritical'] - 0.45) < 1e-3, f"Anchor (0,2,2,2) P(C) expected ~0.45, got {res_0222['pCritical']}"
    assert res_0222['predictedScore'] == 54, f"Anchor (0,2,2,2) score expected 54, got {res_0222['predictedScore']}"
    assert res_0222['threatLevel'] == 'MEDIUM'
    print("  ✓ Anchor (0,2,2,2) unowned+documented: P(C)=0.45, score 54, threat MEDIUM")

    # Anchor (0,0,2,2) -> Unowned, undocumented (non-linear loss)
    res_0022 = score_agent(0, 0, 2, 2, tensor)
    assert abs(res_0022['pCritical'] - 0.88) < 1e-3, f"Anchor (0,0,2,2) P(C) expected ~0.88, got {res_0022['pCritical']}"
    assert res_0022['predictedScore'] == 92, f"Anchor (0,0,2,2) score expected 92, got {res_0022['predictedScore']}"
    assert res_0022['threatLevel'] == 'CRITICAL'
    print("  ✓ Anchor (0,0,2,2) unowned+undocumented: P(C)=0.88, score 92, threat CRITICAL")
    print("  ✓ Non-linear documentation compounding verified: 0.45 -> 0.88")

def test_pgmpy_variable_elimination():
    print("\n--- Testing pgmpy VariableElimination vs CPT Tensor ---")
    model, infer = build_bbn_model()
    tensor = build_cpt_tensor()

    state_map_rev = {
        'O': ['Unowned', 'SingleNoBackup', 'BackedUp'],
        'D': ['Undocumented', 'PartialDoc', 'FullyDocumented'],
        'S': ['Failed', 'Inactive', 'Active'],
        'U': ['HighExposure', 'ModerateExposure', 'Protected'],
    }

    # Test sample configurations across the parameter space
    sample_configs = [
        (2, 2, 2, 2),
        (0, 0, 0, 0),
        (0, 2, 2, 2),
        (0, 0, 2, 2),
        (1, 1, 1, 1),
        (2, 0, 1, 2),
        (1, 2, 0, 1),
    ]

    for (o, d, s, u) in sample_configs:
        idx = ((o * 3 + d) * 3 + s) * 3 + u
        expected = tensor[:, idx]
        
        q = infer.query(
            variables=['R'],
            evidence={
                'O': state_map_rev['O'][o],
                'D': state_map_rev['D'][d],
                'S': state_map_rev['S'][s],
                'U': state_map_rev['U'][u],
            },
            show_progress=False
        )
        actual = q.values  # order: ['Nominal', 'Elevated', 'Critical']
        diff = np.max(np.abs(expected - actual))
        assert diff < 1e-6, f"VE discrepancy at ({o},{d},{s},{u}): expected {expected}, got {actual}, diff {diff}"

    print(f"  ✓ VariableElimination exact match on all sample configurations (max diff < 1e-6)")

def test_js_python_bbn_parity():
    print("\n--- Testing JavaScript (bayes.js) vs Python (bbn_model.py) Parity ---")
    # Query JS tensor via node
    cmd = ["node", "-e", "const b = require('./backend/domain/riskEngine/bayes'); console.log(JSON.stringify(Array.from(b.buildTensor())));"]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
    js_tensor_flat = np.array(json.loads(proc.stdout), dtype=np.float64)
    
    # Reshape JS tensor to (81, 3) then transpose to (3, 81)
    js_tensor = js_tensor_flat.reshape((81, 3)).T
    py_tensor = build_cpt_tensor()

    max_err = float(np.max(np.abs(js_tensor - py_tensor)))
    assert max_err < 1e-12, f"JS/Python tensor mismatch: max error {max_err}"
    print(f"  ✓ Exact parity across all 243 tensor entries (max err: {max_err:.2e})")

def test_js_python_eirwr_parity():
    print("\n--- Testing JavaScript (eirwr.js) vs Python (eirwr_model.py) Parity ---")
    # Synthetic dependency graph chain: 1 -> 2 -> 3 -> 4
    chain_deps = [
        {"source_id": 2, "source_type": "agent", "target_id": 1, "target_type": "agent", "dependency_type": "critical"},
        {"source_id": 3, "source_type": "agent", "target_id": 2, "target_type": "agent", "dependency_type": "high"},
        {"source_id": 4, "source_type": "agent", "target_id": 3, "target_type": "agent", "dependency_type": "normal"},
    ]

    py_engine = EIRWREngine(chain_deps)
    py_seed = np.zeros(py_engine.N, dtype=np.float64)
    seed_idx = py_engine.index_by_key["agent:1"]
    py_seed[seed_idx] = 1.0
    py_r = py_engine.run(py_seed)

    # Call JS eIRWR on the same graph
    js_script = """
    const e = require('./backend/domain/riskEngine/eirwr');
    const deps = %s;
    const eng = e.build(deps);
    const seed = new Float64Array(eng.nodes.length);
    const idx = eng.indexByKey.get('agent:1');
    seed[idx] = 1.0;
    const r = eng.run(seed);
    console.log(JSON.stringify({ nodes: eng.nodes, r: Array.from(r) }));
    """ % json.dumps(chain_deps)

    cmd = ["node", "-e", js_script]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
    js_out = json.loads(proc.stdout)
    js_nodes = js_out["nodes"]
    js_r = np.array(js_out["r"], dtype=np.float64)

    assert py_engine.nodes == js_nodes, f"Node ordering mismatch: {py_engine.nodes} vs {js_nodes}"
    max_r_err = float(np.max(np.abs(py_r - js_r)))
    assert max_r_err < 1e-10, f"eIRWR vector discrepancy between JS and Python: {max_r_err}"
    print(f"  ✓ Node alignment verified: {py_engine.nodes}")
    print(f"  ✓ Exact power-iteration parity: max diff {max_r_err:.2e}")
    print(f"  ✓ Cascade attenuation: agent:1 (seed) -> agent:2 ({py_r[py_engine.index_by_key['agent:2']]:.4f}) -> agent:3 ({py_r[py_engine.index_by_key['agent:3']]:.4f}) -> agent:4 ({py_r[py_engine.index_by_key['agent:4']]:.4f})")

def main():
    print("=================================================================")
    print("OBA Core — Scientific Parity & Mathematical Verification Suite")
    print("=================================================================")
    test_bbn_anchors_and_axioms()
    test_pgmpy_variable_elimination()
    test_js_python_bbn_parity()
    test_js_python_eirwr_parity()
    print("\n=================================================================")
    print("ALL SCIENTIFIC PARITY TESTS PASSED (100% Green) ✅")
    print("=================================================================")

if __name__ == '__main__':
    main()
