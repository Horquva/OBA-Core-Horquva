"""
OBA Core — Bayesian Belief Network Operational Risk Engine (Reference Model)
=============================================================================
Academic Reference:
  - Aquaro et al., "A Bayesian Networks Approach to Operational Risk",
    arXiv:0906.3968
  - Kumar et al., "Cascading Risk Analysis Using Bayesian Networks",
    arXiv:2505.06281

Exact analytical two-stage logit generator reproducing all empirical anchors:
  (2,2,2,2) -> P(N)=0.9600, P(E)=0.0350, P(C)=0.0050 (floor risk)
  (0,0,0,0) -> P(N)=0.0010, P(E)=0.0090, P(C)=0.9900 (catastrophic)
  (0,2,2,2) -> P(C)=0.4500 (unowned, fully documented)
  (0,0,2,2) -> P(C)=0.8800 (unowned, undocumented - non-linear loss)
"""

import math
import json
import os
import numpy as np
from pgmpy.models import DiscreteBayesianNetwork
from pgmpy.factors.discrete import TabularCPD
from pgmpy.inference import VariableElimination

# ─── CPT Two-Stage Chain Logit Coefficients ───────────────────────────────────

CPT_COEFFS = {
    'zC': math.log(0.99 / 0.01),  # 4.59511985013459
    'zE': math.log(0.90 / 0.10),  # 2.19722457733622
    'k': 0.557098,
    'dO': 5.0926,
    'dD': 2.1931,
    'dS': 1.5500,
    'dU': 1.0527,
}

THREAT_BANDS = {
    'CRITICAL': 75,
    'HIGH': 55,
    'MEDIUM': 35,
}

def sigmoid(z: float) -> float:
    return 1.0 / (1.0 + math.exp(-z))

def build_cpt_tensor() -> np.ndarray:
    """
    Constructs the 3 x 81 CPT tensor where columns are indexed by:
      idx = ((o * 3 + d) * 3 + s) * 3 + u
    and rows are:
      0: P(Nominal | o, d, s, u)
      1: P(Elevated | o, d, s, u)
      2: P(Critical | o, d, s, u)
    """
    zC = CPT_COEFFS['zC']
    zE = CPT_COEFFS['zE']
    k = CPT_COEFFS['k']
    dO = CPT_COEFFS['dO']
    dD = CPT_COEFFS['dD']
    dS = CPT_COEFFS['dS']
    dU = CPT_COEFFS['dU']

    values = np.zeros((3, 81), dtype=np.float64)
    i = 0
    for o in range(3):
        for d in range(3):
            for s in range(3):
                for u in range(3):
                    x = (dO * o + dD * d + dS * s + dU * u) / 2.0
                    pC = sigmoid(zC - x)
                    pEnc = sigmoid(zE - (k * dO * o + k * dD * d + k * dS * s + k * dU * u) / 2.0)
                    pE = pEnc * (1.0 - pC)
                    pN = 1.0 - pC - pE
                    values[0, i] = pN
                    values[1, i] = pE
                    values[2, i] = pC
                    i += 1
    return values

def build_bbn_model() -> tuple[DiscreteBayesianNetwork, VariableElimination]:
    """
    Initializes the DiscreteBayesianNetwork with pgmpy, registers TabularCPDs,
    validates the model stochasticity, and returns (model, VariableElimination).
    """
    model = DiscreteBayesianNetwork([
        ('O', 'R'),
        ('D', 'R'),
        ('S', 'R'),
        ('U', 'R'),
    ])

    state_names = {
        'R': ['Nominal', 'Elevated', 'Critical'],
        'O': ['Unowned', 'SingleNoBackup', 'BackedUp'],
        'D': ['Undocumented', 'PartialDoc', 'FullyDocumented'],
        'S': ['Failed', 'Inactive', 'Active'],
        'U': ['HighExposure', 'ModerateExposure', 'Protected'],
    }

    # Uniform priors for parent variables (observed in practice)
    cpd_o = TabularCPD('O', 3, [[1/3], [1/3], [1/3]], state_names={'O': state_names['O']})
    cpd_d = TabularCPD('D', 3, [[1/3], [1/3], [1/3]], state_names={'D': state_names['D']})
    cpd_s = TabularCPD('S', 3, [[1/3], [1/3], [1/3]], state_names={'S': state_names['S']})
    cpd_u = TabularCPD('U', 3, [[1/3], [1/3], [1/3]], state_names={'U': state_names['U']})

    cpt_values = build_cpt_tensor()
    cpd_r = TabularCPD(
        variable='R',
        variable_card=3,
        values=cpt_values,
        evidence=['O', 'D', 'S', 'U'],
        evidence_card=[3, 3, 3, 3],
        state_names=state_names
    )

    model.add_cpds(cpd_o, cpd_d, cpd_s, cpd_u, cpd_r)
    assert model.check_model(), "pgmpy model stochasticity check failed"
    inference = VariableElimination(model)
    return model, inference

def score_agent(o: int, d: int, s: int, u: int, tensor: np.ndarray = None) -> dict:
    """
    Computes exact posterior score and glass-box counterfactual attribution.
    """
    if tensor is None:
        tensor = build_cpt_tensor()

    idx = ((o * 3 + d) * 3 + s) * 3 + u
    pN = tensor[0, idx]
    pE = tensor[1, idx]
    pC = tensor[2, idx]
    score = int(round(100.0 * pC + 45.0 * pE))

    def score_at(o_i, d_i, s_i, u_i):
        c_idx = ((o_i * 3 + d_i) * 3 + s_i) * 3 + u_i
        return int(round(100.0 * tensor[2, c_idx] + 45.0 * tensor[1, c_idx]))

    # Counterfactual attribution: score shed if variable restored to optimal state (2)
    attr_o = max(0, score - score_at(2, d, s, u))
    attr_d = max(0, score - score_at(o, 2, s, u))
    attr_s = max(0, score - score_at(o, d, 2, u))
    attr_u = max(0, score - score_at(o, d, s, 2))

    level = (
        'CRITICAL' if score >= THREAT_BANDS['CRITICAL']
        else 'HIGH' if score >= THREAT_BANDS['HIGH']
        else 'MEDIUM' if score >= THREAT_BANDS['MEDIUM']
        else 'LOW'
    )

    return {
        'pNominal': float(pN),
        'pElevated': float(pE),
        'pCritical': float(pC),
        'predictedScore': score,
        'threatLevel': level,
        'attribution': {
            'ownership': attr_o,
            'documentation': attr_d,
            'runtime_state': attr_s,
            'cascade_exposure': attr_u,
        },
    }

if __name__ == '__main__':
    print("Building and validating BBN reference model in pgmpy...")
    model, infer = build_bbn_model()
    print("Model check passed successfully!")

    tensor = build_cpt_tensor()
    print(f"CPT Tensor shape: {tensor.shape} (3 states, 81 columns)")
    print(f"Column sums check (min, max): ({tensor.sum(axis=0).min():.6f}, {tensor.sum(axis=0).max():.6f})")

    # Save tensor fixture
    fixtures_dir = os.path.join(os.path.dirname(__file__), 'fixtures')
    os.makedirs(fixtures_dir, exist_ok=True)
    fixture_path = os.path.join(fixtures_dir, 'cpt_tensor.json')
    with open(fixture_path, 'w') as f:
        json.dump(tensor.tolist(), f, indent=2)
    print(f"Saved CPT tensor fixture to {fixture_path}")
