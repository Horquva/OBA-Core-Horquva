"""
OBA Core — Enhanced Iterative Random Walk with Restart (eIRWR) Reference Model
=============================================================================
Academic Reference:
  - Khan & Farea, "eIRWR: Enhanced Iterative Random Walk with Restart for
    Scalable Root Cause Analysis in Microservices", arXiv:2608.08073

Algorithm 1: Enhanced Iterative Random Walk with Restart (eIRWR)
  - Edge weights lambda(e) per C3:
      strength / 100 if dependencies.strength present (0.30 - 0.90)
      { critical: 3.0, high: 2.0, normal: 1.0, low: 0.5 }[type] otherwise
  - Paper parameters (defaults):
      alpha = 0.15
      r_base = 0.1
      beta = 2.0
      rho = 0.3
      q = 2.0
      mu = 0.1
      eps = 1e-6
      n_outer = 2
      max_inner = 200
"""

import math
from typing import Dict, List, Any, Optional
import numpy as np

DEFAULTS = {
    'alpha': 0.15,
    'r_base': 0.1,
    'beta': 2.0,
    'rho': 0.3,
    'q': 2.0,
    'mu': 0.1,
    'eps': 1e-6,
    'n_outer': 2,
    'max_inner': 200,
}

TYPE_LAMBDA = {
    'critical': 3.0,
    'high': 2.0,
    'normal': 1.0,
    'medium': 1.0,
    'low': 0.5,
    'unknown': 1.0,
}

def key_of(node_type: str, node_id: Any) -> str:
    return f"{node_type}:{node_id}"

class EIRWREngine:
    def __init__(self, dependencies: List[Dict[str, Any]], params: Optional[Dict[str, Any]] = None):
        self.p = {**DEFAULTS, **(params or {})}
        
        self.nodes = []
        self.index_by_key = {}

        def node_of(node_type, node_id):
            k = key_of(node_type, node_id)
            if k not in self.index_by_key:
                self.index_by_key[k] = len(self.nodes)
                self.nodes.append(k)
            return self.index_by_key[k]

        def lambda_of(edge):
            strength = edge.get('strength')
            if strength is not None:
                return float(strength) / 100.0
            dep_type = str(edge.get('dependency_type') or 'unknown').strip().lower()
            return TYPE_LAMBDA.get(dep_type, 1.0)

        raw = []
        for dep in (dependencies or []):
            if not dep or dep.get('source_id') is None or dep.get('target_id') is None:
                continue
            u = node_of(dep['source_type'], dep['source_id'])
            v = node_of(dep['target_type'], dep['target_id'])
            raw.append({'from': u, 'to': v, 'lambda': lambda_of(dep)})

        self.N = len(self.nodes)
        N = self.N
        self.forward_set = set()
        self.edge_pairs = []
        row_idx = [[] for _ in range(N)]
        row_val = [[] for _ in range(N)]

        for e in raw:
            u, v, lam = e['from'], e['to'], e['lambda']
            pair_key = u * N + v
            if pair_key not in self.forward_set:
                row_idx[u].append(v)
                row_val[u].append(lam)
                self.forward_set.add(pair_key)
            else:
                k = row_idx[u].index(v)
                row_val[u][k] += lam
            self.edge_pairs.append((u, v))

        self.base_idx = row_idx
        self.base_val = []
        for i in range(N):
            row_sum = sum(row_val[i])
            if row_sum > 0:
                self.base_val.append([w / row_sum for w in row_val[i]])
            else:
                self.base_val.append([])

        self.bwd_pairs = [(u, v) for u, v in self.edge_pairs if (v * N + u) not in self.forward_set]

    def run(self, seed: np.ndarray) -> np.ndarray:
        N = self.N
        if N == 0:
            return np.zeros(0, dtype=np.float64)

        seed = np.asarray(seed, dtype=np.float64)
        if len(seed) != N:
            raise ValueError(f"Seed length {len(seed)} does not match graph size {N}")

        if np.any(seed < 0):
            raise ValueError("eIRWR: seed weights must be non-negative")

        seed_sum = float(np.sum(seed))
        seed_max = float(np.max(seed)) if len(seed) > 0 else 0.0

        if seed_sum <= 0 or seed_max <= 0:
            return np.zeros(N, dtype=np.float64)

        # L1-normalized initial restart vector s
        s = seed / seed_sum

        # Adaptive resilience row-scale: 1 - r_base * exp(-beta * shat)
        row_scale = np.zeros(N, dtype=np.float64)
        for i in range(N):
            shat = seed[i] / seed_max
            row_scale[i] = 1.0 - self.p['r_base'] * math.exp(-self.p['beta'] * shat)

        base_val = [
            [w * row_scale[i] for w in self.base_val[i]]
            for i in range(N)
        ]

        r_vec = s.copy()
        prev_outer = None

        for outer in range(1, self.p['n_outer'] + 1):
            r_sum = float(np.sum(r_vec))
            if r_sum > 0:
                r_vec /= r_sum

            # Belief refinement (Eq. 11)
            b = (1.0 - self.p['mu']) * s + self.p['mu'] * r_vec
            b_max = float(np.max(b))
            b_sum = float(np.sum(b))
            C = (b / b_max) if b_max > 0 else np.zeros(N, dtype=np.float64)

            # Combined operator: M = RowNorm(M_base * diag(C) + A_bwd + A_self)
            m_idx = [self.base_idx[i].copy() for i in range(N)]
            m_val = [[v * C[self.base_idx[i][k]] for k, v in enumerate(base_val[i])] for i in range(N)]

            def row_entry(row, target):
                try:
                    return m_idx[row].index(target)
                except ValueError:
                    return None

            for u, v in self.bwd_pairs:
                k = row_entry(v, u)
                if k is None:
                    m_idx[v].append(u)
                    m_val[v].append(self.p['rho'] * C[u])
                else:
                    m_val[v][k] += self.p['rho'] * C[u]

            for i in range(N):
                f_max = 0.0
                for k, target in enumerate(m_idx[i]):
                    if (i * N + target) in self.forward_set:
                        if m_val[i][k] > f_max:
                            f_max = m_val[i][k]
                self_loop = max(0.0, C[i] - f_max)
                if self_loop > 0:
                    k = row_entry(i, i)
                    if k is None:
                        m_idx[i].append(i)
                        m_val[i].append(self_loop)
                    else:
                        m_val[i][k] += self_loop

            for i in range(N):
                r_total = sum(m_val[i])
                if r_total > 0:
                    for k in range(len(m_val[i])):
                        m_val[i][k] /= r_total

            # Power-law teleportation sharpening
            b_mean = b_sum / N
            sigma = (b_max / b_mean) if b_mean > 0 else 0.0
            q_adapt = 1.0 + (self.p['q'] - 1.0) * min(1.0, max(0.0, (sigma - 5.0) / 15.0))
            v = np.power(b, q_adapt)
            v_sum = float(np.sum(v))
            if v_sum > 0:
                v /= v_sum
            else:
                v = np.zeros(N)
                v[0] = 1.0

            # Inner power iteration: r <- (1 - alpha) * M * r + alpha * v
            r_in = r_vec.copy()
            for _ in range(self.p['max_inner']):
                r_prev = r_in.copy()
                r_in = np.zeros(N, dtype=np.float64)
                for i in range(N):
                    acc = sum(m_val[i][k] * r_prev[m_idx[i][k]] for k in range(len(m_idx[i])))
                    r_in[i] = (1.0 - self.p['alpha']) * acc + self.p['alpha'] * v[i]

                if np.sum(np.abs(r_in - r_prev)) < self.p['eps']:
                    break

            r_vec = r_in

            if prev_outer is not None:
                if np.sum(np.abs(r_vec - prev_outer)) < self.p['eps']:
                    break
            prev_outer = r_vec.copy()

        return r_vec
