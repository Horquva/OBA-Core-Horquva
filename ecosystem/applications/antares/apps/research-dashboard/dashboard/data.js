window.FSI_DATA = {
  "generated_at": "2026-08-18T04:07:55+00:00",
  "counts": {
    "signals": 7,
    "patterns": 3,
    "artifacts": 1,
    "contradictions": 4
  },
  "signals": [
    {
      "id": "sig_39956fe626e0285b",
      "title": "Engineering teams embedding AI copilots into daily review workflows",
      "description": "Multiple engineering organizations report moving AI assistant usage from individual experimentation into the formal code review and design review workflow, with a human in the loop retained as the approving authority.",
      "state": "PATTERN_CANDIDATE",
      "themes": [
        "human_ai_collaboration"
      ],
      "dimensions": [
        "human_ai_collaboration",
        "workforce",
        "collaboration"
      ],
      "organizations": [
        "Contoso Engineering",
        "Northwind Platform Group",
        "Fabrikam Financial"
      ],
      "evidence_count": 3,
      "evidence_strength": 0.867,
      "trajectory": "STABLE",
      "trajectory_series": [
        {
          "month": "2026-01",
          "evidence_count": 1
        },
        {
          "month": "2026-03",
          "evidence_count": 1
        },
        {
          "month": "2026-05",
          "evidence_count": 1
        }
      ],
      "impact": {
        "signal_id": "sig_39956fe626e0285b",
        "dimensions": [
          {
            "dimension": "human_ai_collaboration",
            "direction": "INCREASES",
            "severity": 5,
            "horizon_months": 12,
            "rationale": "Derived from theme 'Human-AI collaboration' prior."
          },
          {
            "dimension": "workforce",
            "direction": "RESHAPES",
            "severity": 4,
            "horizon_months": 18,
            "rationale": "Derived from theme 'Human-AI collaboration' prior."
          },
          {
            "dimension": "collaboration",
            "direction": "RESHAPES",
            "severity": 3,
            "horizon_months": 18,
            "rationale": "Derived from theme 'Human-AI collaboration' prior."
          }
        ],
        "breadth": 3,
        "max_severity": 5,
        "nearest_horizon_months": 12
      },
      "history": [
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "DISCOVERED",
          "note": "discovered"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "EVIDENCE_CAPTURED",
          "note": "evidence ev_edbf356af57015c5 attached",
          "actor": "seed"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "IMPACT_ANALYZED",
          "note": "3 dimensions analyzed",
          "actor": "seed"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "CORRELATED",
          "note": "relationships generated",
          "actor": "demo"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "PATTERN_CANDIDATE",
          "note": "contributes to pattern pat_90a3b95db85c3aac",
          "actor": "demo"
        }
      ]
    },
    {
      "id": "sig_5de34fd1e79525f4",
      "title": "Organizations rewriting approval policy as machine-checkable guardrails",
      "description": "Governance and compliance teams are expressing policy as code so that guardrails execute automatically at the point of work, with audit evidence captured as a by-product rather than assembled afterwards.",
      "state": "PATTERN_CANDIDATE",
      "themes": [
        "adaptive_governance"
      ],
      "dimensions": [
        "governance",
        "accountability",
        "trust"
      ],
      "organizations": [
        "Fabrikam Financial",
        "Contoso Engineering"
      ],
      "evidence_count": 2,
      "evidence_strength": 0.925,
      "trajectory": "STABLE",
      "trajectory_series": [
        {
          "month": "2026-02",
          "evidence_count": 1
        },
        {
          "month": "2026-04",
          "evidence_count": 1
        }
      ],
      "impact": {
        "signal_id": "sig_5de34fd1e79525f4",
        "dimensions": [
          {
            "dimension": "governance",
            "direction": "RESHAPES",
            "severity": 5,
            "horizon_months": 18,
            "rationale": "Derived from theme 'Adaptive governance' prior."
          },
          {
            "dimension": "accountability",
            "direction": "INCREASES",
            "severity": 4,
            "horizon_months": 18,
            "rationale": "Derived from theme 'Adaptive governance' prior."
          },
          {
            "dimension": "trust",
            "direction": "INCREASES",
            "severity": 3,
            "horizon_months": 24,
            "rationale": "Derived from theme 'Adaptive governance' prior."
          }
        ],
        "breadth": 3,
        "max_severity": 5,
        "nearest_horizon_months": 18
      },
      "history": [
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "DISCOVERED",
          "note": "discovered"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "EVIDENCE_CAPTURED",
          "note": "evidence ev_b4be2e9c864d2f96 attached",
          "actor": "seed"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "IMPACT_ANALYZED",
          "note": "3 dimensions analyzed",
          "actor": "seed"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "CORRELATED",
          "note": "relationships generated",
          "actor": "demo"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "PATTERN_CANDIDATE",
          "note": "contributes to pattern pat_18d2ba674a60ba00",
          "actor": "demo"
        }
      ]
    },
    {
      "id": "sig_f91fd27b64072329",
      "title": "Multi-agent orchestration replacing manual work routing",
      "description": "Operations groups are handing routing and escalation decisions to autonomous agent orchestration layers, with humans supervising exceptions rather than dispatching every item of work.",
      "state": "PATTERN_CANDIDATE",
      "themes": [
        "autonomous_coordination"
      ],
      "dimensions": [
        "autonomous_coordination",
        "operational_execution"
      ],
      "organizations": [
        "Northwind Platform Group"
      ],
      "evidence_count": 2,
      "evidence_strength": 0.5,
      "trajectory": "STABLE",
      "trajectory_series": [
        {
          "month": "2026-03",
          "evidence_count": 1
        },
        {
          "month": "2026-04",
          "evidence_count": 1
        }
      ],
      "impact": {
        "signal_id": "sig_f91fd27b64072329",
        "dimensions": [
          {
            "dimension": "autonomous_coordination",
            "direction": "INCREASES",
            "severity": 5,
            "horizon_months": 18,
            "rationale": "Derived from theme 'Autonomous coordination' prior."
          },
          {
            "dimension": "operational_execution",
            "direction": "RESHAPES",
            "severity": 4,
            "horizon_months": 12,
            "rationale": "Derived from theme 'Autonomous coordination' prior."
          }
        ],
        "breadth": 2,
        "max_severity": 5,
        "nearest_horizon_months": 12
      },
      "history": [
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "DISCOVERED",
          "note": "discovered"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "EVIDENCE_CAPTURED",
          "note": "evidence ev_136e6c9eec0135bd attached",
          "actor": "seed"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "IMPACT_ANALYZED",
          "note": "2 dimensions analyzed",
          "actor": "seed"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "CORRELATED",
          "note": "relationships generated",
          "actor": "demo"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "PATTERN_CANDIDATE",
          "note": "contributes to pattern pat_7df2354b81b4a597",
          "actor": "demo"
        }
      ]
    },
    {
      "id": "sig_b358cd94ddb8c5ca",
      "title": "Distributed decision authority pushed to autonomous squads",
      "description": "Leadership structures are devolving decision rights to self-managing squads, with accountability evidenced through recorded decision logs rather than hierarchical sign-off chains.",
      "state": "PATTERN_CANDIDATE",
      "themes": [
        "distributed_leadership",
        "autonomous_coordination"
      ],
      "dimensions": [
        "leadership",
        "decision_making",
        "accountability",
        "autonomous_coordination",
        "operational_execution"
      ],
      "organizations": [
        "Fabrikam Financial"
      ],
      "evidence_count": 2,
      "evidence_strength": 0.545,
      "trajectory": "STABLE",
      "trajectory_series": [
        {
          "month": "2021-06",
          "evidence_count": 1
        },
        {
          "month": "2026-02",
          "evidence_count": 1
        }
      ],
      "impact": {
        "signal_id": "sig_b358cd94ddb8c5ca",
        "dimensions": [
          {
            "dimension": "autonomous_coordination",
            "direction": "INCREASES",
            "severity": 5,
            "horizon_months": 18,
            "rationale": "Derived from theme 'Autonomous coordination' prior."
          },
          {
            "dimension": "leadership",
            "direction": "RESHAPES",
            "severity": 4,
            "horizon_months": 24,
            "rationale": "Derived from theme 'Distributed leadership' prior."
          },
          {
            "dimension": "accountability",
            "direction": "RESHAPES",
            "severity": 4,
            "horizon_months": 24,
            "rationale": "Derived from theme 'Distributed leadership' prior."
          },
          {
            "dimension": "operational_execution",
            "direction": "RESHAPES",
            "severity": 4,
            "horizon_months": 12,
            "rationale": "Derived from theme 'Autonomous coordination' prior."
          },
          {
            "dimension": "decision_making",
            "direction": "INCREASES",
            "severity": 3,
            "horizon_months": 18,
            "rationale": "Derived from theme 'Distributed leadership' prior."
          }
        ],
        "breadth": 5,
        "max_severity": 5,
        "nearest_horizon_months": 12
      },
      "history": [
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "DISCOVERED",
          "note": "discovered"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "EVIDENCE_CAPTURED",
          "note": "evidence ev_219de735f010b0e6 attached",
          "actor": "seed"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "IMPACT_ANALYZED",
          "note": "5 dimensions analyzed",
          "actor": "seed"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "CORRELATED",
          "note": "relationships generated",
          "actor": "demo"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "PATTERN_CANDIDATE",
          "note": "contributes to pattern pat_7df2354b81b4a597",
          "actor": "demo"
        }
      ]
    },
    {
      "id": "sig_126cbfbcd1480f52",
      "title": "Institutional memory rebuilt as queryable knowledge graphs",
      "description": "Organizations are consolidating scattered documentation into retrieval-backed knowledge graphs so that past decisions and their provenance can be queried rather than rediscovered.",
      "state": "IMPACT_ANALYZED",
      "themes": [
        "organizational_memory"
      ],
      "dimensions": [
        "organizational_memory",
        "organizational_intelligence"
      ],
      "organizations": [
        "Contoso Engineering"
      ],
      "evidence_count": 1,
      "evidence_strength": 0.85,
      "trajectory": "INSUFFICIENT_DATA",
      "trajectory_series": [
        {
          "month": "2026-01",
          "evidence_count": 1
        }
      ],
      "impact": {
        "signal_id": "sig_126cbfbcd1480f52",
        "dimensions": [
          {
            "dimension": "organizational_memory",
            "direction": "INCREASES",
            "severity": 4,
            "horizon_months": 24,
            "rationale": "Derived from theme 'Organizational memory' prior."
          },
          {
            "dimension": "organizational_intelligence",
            "direction": "INCREASES",
            "severity": 3,
            "horizon_months": 24,
            "rationale": "Derived from theme 'Organizational memory' prior."
          }
        ],
        "breadth": 2,
        "max_severity": 4,
        "nearest_horizon_months": 24
      },
      "history": [
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "DISCOVERED",
          "note": "discovered"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "EVIDENCE_CAPTURED",
          "note": "evidence ev_1733ecf80806408e attached",
          "actor": "seed"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "IMPACT_ANALYZED",
          "note": "2 dimensions analyzed",
          "actor": "seed"
        }
      ]
    },
    {
      "id": "sig_b8fb00ad17aae76a",
      "title": "Design decisions drafted by AI assistant and ratified by human architects",
      "description": "Architecture groups are using an AI assistant to draft options and trade-off analysis, keeping a human in the loop as the ratifying authority so that accountability for the decision stays with a named person.",
      "state": "PATTERN_CANDIDATE",
      "themes": [
        "human_ai_collaboration"
      ],
      "dimensions": [
        "human_ai_collaboration",
        "workforce",
        "collaboration"
      ],
      "organizations": [
        "Fabrikam Financial",
        "Contoso Engineering"
      ],
      "evidence_count": 3,
      "evidence_strength": 0.867,
      "trajectory": "STABLE",
      "trajectory_series": [
        {
          "month": "2026-02",
          "evidence_count": 1
        },
        {
          "month": "2026-04",
          "evidence_count": 1
        },
        {
          "month": "2026-05",
          "evidence_count": 1
        }
      ],
      "impact": {
        "signal_id": "sig_b8fb00ad17aae76a",
        "dimensions": [
          {
            "dimension": "human_ai_collaboration",
            "direction": "INCREASES",
            "severity": 5,
            "horizon_months": 12,
            "rationale": "Derived from theme 'Human-AI collaboration' prior."
          },
          {
            "dimension": "workforce",
            "direction": "RESHAPES",
            "severity": 4,
            "horizon_months": 18,
            "rationale": "Derived from theme 'Human-AI collaboration' prior."
          },
          {
            "dimension": "collaboration",
            "direction": "RESHAPES",
            "severity": 3,
            "horizon_months": 18,
            "rationale": "Derived from theme 'Human-AI collaboration' prior."
          }
        ],
        "breadth": 3,
        "max_severity": 5,
        "nearest_horizon_months": 12
      },
      "history": [
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "DISCOVERED",
          "note": "discovered"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "EVIDENCE_CAPTURED",
          "note": "evidence ev_0fb5aab34c471011 attached",
          "actor": "seed"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "IMPACT_ANALYZED",
          "note": "3 dimensions analyzed",
          "actor": "seed"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "CORRELATED",
          "note": "relationships generated",
          "actor": "demo"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "PATTERN_CANDIDATE",
          "note": "contributes to pattern pat_90a3b95db85c3aac",
          "actor": "demo"
        }
      ]
    },
    {
      "id": "sig_c0f00566deda71cb",
      "title": "Continuous audit trails replacing periodic compliance review cycles",
      "description": "Regulated organizations are replacing quarterly compliance review with continuous audit evidence capture, so oversight becomes a property of the workflow instead of a separate governance exercise.",
      "state": "PATTERN_CANDIDATE",
      "themes": [
        "adaptive_governance"
      ],
      "dimensions": [
        "governance",
        "accountability",
        "trust"
      ],
      "organizations": [
        "Fabrikam Financial"
      ],
      "evidence_count": 2,
      "evidence_strength": 0.925,
      "trajectory": "STABLE",
      "trajectory_series": [
        {
          "month": "2026-03",
          "evidence_count": 1
        },
        {
          "month": "2026-05",
          "evidence_count": 1
        }
      ],
      "impact": {
        "signal_id": "sig_c0f00566deda71cb",
        "dimensions": [
          {
            "dimension": "governance",
            "direction": "RESHAPES",
            "severity": 5,
            "horizon_months": 18,
            "rationale": "Derived from theme 'Adaptive governance' prior."
          },
          {
            "dimension": "accountability",
            "direction": "INCREASES",
            "severity": 4,
            "horizon_months": 18,
            "rationale": "Derived from theme 'Adaptive governance' prior."
          },
          {
            "dimension": "trust",
            "direction": "INCREASES",
            "severity": 3,
            "horizon_months": 24,
            "rationale": "Derived from theme 'Adaptive governance' prior."
          }
        ],
        "breadth": 3,
        "max_severity": 5,
        "nearest_horizon_months": 18
      },
      "history": [
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "DISCOVERED",
          "note": "discovered"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "EVIDENCE_CAPTURED",
          "note": "evidence ev_ac03b6f76af24195 attached",
          "actor": "seed"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "IMPACT_ANALYZED",
          "note": "3 dimensions analyzed",
          "actor": "seed"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "CORRELATED",
          "note": "relationships generated",
          "actor": "demo"
        },
        {
          "at": "2026-08-18T04:07:55+00:00",
          "state": "PATTERN_CANDIDATE",
          "note": "contributes to pattern pat_18d2ba674a60ba00",
          "actor": "demo"
        }
      ]
    }
  ],
  "patterns": [
    {
      "id": "pat_90a3b95db85c3aac",
      "name": "Human-AI collaboration",
      "theme": "human_ai_collaboration",
      "state": "VALIDATED",
      "confidence": 0.722,
      "band": "MEDIUM",
      "factors": {
        "evidence_strength": 0.867,
        "recurrence": 0.4,
        "source_diversity": 0.75,
        "organizational_breadth": 0.5,
        "temporal_persistence": 1.0,
        "contradiction_penalty": 0
      },
      "trajectory": "STABLE",
      "dimensions": [
        "collaboration",
        "human_ai_collaboration",
        "workforce"
      ],
      "signal_ids": [
        "sig_39956fe626e0285b",
        "sig_b8fb00ad17aae76a"
      ],
      "explanation": {
        "why_detected": "2 independent signals classified under 'Human-AI collaboration', corroborated by 6 evidence items across 4 distinct sources.",
        "supporting_signals": [
          {
            "id": "sig_39956fe626e0285b",
            "title": "Engineering teams embedding AI copilots into daily review workflows",
            "state": "CORRELATED"
          },
          {
            "id": "sig_b8fb00ad17aae76a",
            "title": "Design decisions drafted by AI assistant and ratified by human architects",
            "state": "CORRELATED"
          }
        ],
        "supporting_evidence": [
          {
            "id": "ev_edbf356af57015c5",
            "title": "State of Engineering Productivity 2025",
            "source": "Engineering Productivity Institute",
            "source_type": "INDUSTRY_REPORT",
            "status": "VERIFIED",
            "weight": 0.85,
            "url": "https://example.org/reports/eng-productivity-2025"
          },
          {
            "id": "ev_121d9a6e73bbccaa",
            "title": "Copilot adoption in regulated code review",
            "source": "Journal of Software Organization",
            "source_type": "PEER_REVIEWED",
            "status": "VERIFIED",
            "weight": 1.0,
            "url": "https://example.org/jso/2026/assisted-review"
          },
          {
            "id": "ev_4f1fadaee84d58ab",
            "title": "Internal observation: review queue composition shift",
            "source": "Internal Engineering Observation Log",
            "source_type": "INTERNAL_OBSERVATION",
            "status": "VERIFIED",
            "weight": 0.75,
            "url": ""
          },
          {
            "id": "ev_0fb5aab34c471011",
            "title": "Assisted architecture decision records",
            "source": "Journal of Software Organization",
            "source_type": "PEER_REVIEWED",
            "status": "VERIFIED",
            "weight": 1.0,
            "url": "https://example.org/jso/2026/assisted-adr"
          },
          {
            "id": "ev_ae2ba52d419436ae",
            "title": "Architecture practice survey",
            "source": "Enterprise Architecture Digest",
            "source_type": "INDUSTRY_REPORT",
            "status": "VERIFIED",
            "weight": 0.85,
            "url": "https://example.org/ead/practice-survey"
          },
          {
            "id": "ev_04022e6f6b6c3634",
            "title": "Internal observation: ADR authorship shift",
            "source": "Internal Engineering Observation Log",
            "source_type": "INTERNAL_OBSERVATION",
            "status": "VERIFIED",
            "weight": 0.75,
            "url": ""
          }
        ],
        "evidence_strength": 0.867,
        "affected_dimensions": [
          "collaboration",
          "human_ai_collaboration",
          "workforce"
        ],
        "observation_window": {
          "first": "2026-01-15",
          "last": "2026-05-30",
          "distinct_months": 5
        },
        "scoring_method": {
          "weights": {
            "evidence_strength": 0.25,
            "recurrence": 0.2,
            "source_diversity": 0.2,
            "organizational_breadth": 0.15,
            "temporal_persistence": 0.2
          },
          "factors": {
            "evidence_strength": 0.867,
            "recurrence": 0.4,
            "source_diversity": 0.75,
            "organizational_breadth": 0.5,
            "temporal_persistence": 1.0,
            "contradiction_penalty": 0
          },
          "formula": "sum(weight_i * factor_i) * (1 - contradiction_penalty)"
        },
        "open_questions": [
          "What would falsify this pattern? Name the counter-evidence to look for."
        ]
      },
      "contradictions": []
    },
    {
      "id": "pat_18d2ba674a60ba00",
      "name": "Adaptive governance",
      "theme": "adaptive_governance",
      "state": "PATTERN_CANDIDATE",
      "confidence": 0.686,
      "band": "MEDIUM",
      "factors": {
        "evidence_strength": 0.925,
        "recurrence": 0.4,
        "source_diversity": 0.5,
        "organizational_breadth": 0.5,
        "temporal_persistence": 1.0,
        "contradiction_penalty": 0
      },
      "trajectory": "STABLE",
      "dimensions": [
        "accountability",
        "governance",
        "trust"
      ],
      "signal_ids": [
        "sig_5de34fd1e79525f4",
        "sig_c0f00566deda71cb"
      ],
      "explanation": {
        "why_detected": "2 independent signals classified under 'Adaptive governance', corroborated by 4 evidence items across 3 distinct sources.",
        "supporting_signals": [
          {
            "id": "sig_5de34fd1e79525f4",
            "title": "Organizations rewriting approval policy as machine-checkable guardrails",
            "state": "CORRELATED"
          },
          {
            "id": "sig_c0f00566deda71cb",
            "title": "Continuous audit trails replacing periodic compliance review cycles",
            "state": "CORRELATED"
          }
        ],
        "supporting_evidence": [
          {
            "id": "ev_b4be2e9c864d2f96",
            "title": "Policy-as-code in regulated enterprises",
            "source": "Governance Quarterly",
            "source_type": "INDUSTRY_REPORT",
            "status": "VERIFIED",
            "weight": 0.85,
            "url": "https://example.org/gq/policy-as-code"
          },
          {
            "id": "ev_f6bdaa1bb13f6069",
            "title": "Automated compliance evidence capture",
            "source": "Journal of Software Organization",
            "source_type": "PEER_REVIEWED",
            "status": "VERIFIED",
            "weight": 1.0,
            "url": "https://example.org/jso/2026/audit-evidence"
          },
          {
            "id": "ev_ac03b6f76af24195",
            "title": "Continuous assurance in regulated industries",
            "source": "Regulatory Technology Review",
            "source_type": "INDUSTRY_REPORT",
            "status": "VERIFIED",
            "weight": 0.85,
            "url": "https://example.org/rtr/continuous-assurance"
          },
          {
            "id": "ev_f8600f537f12b53a",
            "title": "Auditor acceptance of automated compliance records",
            "source": "Journal of Software Organization",
            "source_type": "PEER_REVIEWED",
            "status": "VERIFIED",
            "weight": 1.0,
            "url": "https://example.org/jso/2026/auditor-acceptance"
          }
        ],
        "evidence_strength": 0.925,
        "affected_dimensions": [
          "accountability",
          "governance",
          "trust"
        ],
        "observation_window": {
          "first": "2026-02-20",
          "last": "2026-05-18",
          "distinct_months": 4
        },
        "scoring_method": {
          "weights": {
            "evidence_strength": 0.25,
            "recurrence": 0.2,
            "source_diversity": 0.2,
            "organizational_breadth": 0.15,
            "temporal_persistence": 0.2
          },
          "factors": {
            "evidence_strength": 0.925,
            "recurrence": 0.4,
            "source_diversity": 0.5,
            "organizational_breadth": 0.5,
            "temporal_persistence": 1.0,
            "contradiction_penalty": 0
          },
          "formula": "sum(weight_i * factor_i) * (1 - contradiction_penalty)"
        },
        "open_questions": [
          "Would this pattern survive if we added a peer-reviewed or internal-observation source type?"
        ]
      },
      "contradictions": []
    },
    {
      "id": "pat_7df2354b81b4a597",
      "name": "Autonomous coordination",
      "theme": "autonomous_coordination",
      "state": "PATTERN_CANDIDATE",
      "confidence": 0.425,
      "band": "LOW",
      "factors": {
        "evidence_strength": 0.522,
        "recurrence": 0.4,
        "source_diversity": 0.75,
        "organizational_breadth": 0.833,
        "temporal_persistence": 1.0,
        "contradiction_penalty": 0.38
      },
      "trajectory": "STABLE",
      "dimensions": [
        "accountability",
        "autonomous_coordination",
        "decision_making",
        "leadership",
        "operational_execution"
      ],
      "signal_ids": [
        "sig_b358cd94ddb8c5ca",
        "sig_f91fd27b64072329"
      ],
      "explanation": {
        "why_detected": "2 independent signals classified under 'Autonomous coordination', corroborated by 4 evidence items across 4 distinct sources.",
        "supporting_signals": [
          {
            "id": "sig_f91fd27b64072329",
            "title": "Multi-agent orchestration replacing manual work routing",
            "state": "CORRELATED"
          },
          {
            "id": "sig_b358cd94ddb8c5ca",
            "title": "Distributed decision authority pushed to autonomous squads",
            "state": "CORRELATED"
          }
        ],
        "supporting_evidence": [
          {
            "id": "ev_136e6c9eec0135bd",
            "title": "Agent orchestration in operations",
            "source": "Operations Technology Review",
            "source_type": "INDUSTRY_REPORT",
            "status": "VERIFIED",
            "weight": 0.85,
            "url": "https://example.org/otr/agent-orchestration"
          },
          {
            "id": "ev_7a66bbe3539058ec",
            "title": "Vendor claims on autonomous operations",
            "source": "AgentCo Marketing",
            "source_type": "VENDOR_PUBLICATION",
            "status": "DISPUTED",
            "weight": 0.15,
            "url": "https://example.org/agentco/autonomy"
          },
          {
            "id": "ev_b387ab4a8be79910",
            "title": "Flat organization retrospective",
            "source": "Practitioner Notes Blog",
            "source_type": "PRACTITIONER_BLOG",
            "status": "UNVERIFIED",
            "weight": 0.24,
            "url": "https://example.org/blog/flat-retro"
          },
          {
            "id": "ev_219de735f010b0e6",
            "title": "Devolved decision rights in scaled organizations",
            "source": "Governance Quarterly",
            "source_type": "INDUSTRY_REPORT",
            "status": "VERIFIED",
            "weight": 0.85,
            "url": "https://example.org/gq/devolved-authority"
          }
        ],
        "evidence_strength": 0.522,
        "affected_dimensions": [
          "accountability",
          "autonomous_coordination",
          "decision_making",
          "leadership",
          "operational_execution"
        ],
        "observation_window": {
          "first": "2021-06-01",
          "last": "2026-04-01",
          "distinct_months": 4
        },
        "scoring_method": {
          "weights": {
            "evidence_strength": 0.25,
            "recurrence": 0.2,
            "source_diversity": 0.2,
            "organizational_breadth": 0.15,
            "temporal_persistence": 0.2
          },
          "factors": {
            "evidence_strength": 0.522,
            "recurrence": 0.4,
            "source_diversity": 0.75,
            "organizational_breadth": 0.833,
            "temporal_persistence": 1.0,
            "contradiction_penalty": 0.38
          },
          "formula": "sum(weight_i * factor_i) * (1 - contradiction_penalty)"
        },
        "open_questions": [
          "4 contradiction findings are unresolved. Which are material to the claim?"
        ]
      },
      "contradictions": [
        {
          "type": "CONFLICTING_EVIDENCE",
          "severity": "HIGH",
          "detail": "Evidence 'Vendor claims on autonomous operations' is marked disputed.",
          "signal_id": "sig_f91fd27b64072329",
          "evidence_id": "ev_7a66bbe3539058ec"
        },
        {
          "type": "WEAK_EVIDENCE",
          "severity": "LOW",
          "detail": "Evidence 'Vendor claims on autonomous operations' has effective weight 0.15 (source: VENDOR_PUBLICATION).",
          "signal_id": "sig_f91fd27b64072329",
          "evidence_id": "ev_7a66bbe3539058ec"
        },
        {
          "type": "WEAK_EVIDENCE",
          "severity": "LOW",
          "detail": "Evidence 'Flat organization retrospective' has effective weight 0.24 (source: PRACTITIONER_BLOG).",
          "signal_id": "sig_b358cd94ddb8c5ca",
          "evidence_id": "ev_b387ab4a8be79910"
        },
        {
          "type": "OUTDATED_EVIDENCE",
          "severity": "MEDIUM",
          "detail": "Evidence 'Flat organization retrospective' predates the 730-day freshness window (observed 2021-06-01).",
          "signal_id": "sig_b358cd94ddb8c5ca",
          "evidence_id": "ev_b387ab4a8be79910"
        }
      ]
    }
  ],
  "convergence": []
};
