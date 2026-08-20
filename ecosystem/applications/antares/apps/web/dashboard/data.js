window.ANTARES_DATA = {
  "generated_at": "2026-08-14T09:56:52.458Z",
  "overview": {
    "platforms_registered": 11,
    "jobs_tracked": 10,
    "capabilities_in_registry": 2,
    "research_signals": 7,
    "research_patterns": 3,
    "contradictions_flagged": 4
  },
  "platforms": [
    {
      "id": "tech-intel",
      "name": "Technology Intelligence",
      "owner": "Aurangzeb Malik"
    },
    {
      "id": "org-futures",
      "name": "Organizational Futures Engineering",
      "owner": "Muhammad Muzammel Aslam"
    },
    {
      "id": "future-signal",
      "name": "Future-Signal Intelligence",
      "owner": "Syed Hadeed Safdar"
    },
    {
      "id": "future-org",
      "name": "Future Organization Engineering (AI Agents)",
      "owner": "Zeeshan Farooq"
    },
    {
      "id": "aiml-intel",
      "name": "AI/ML Intelligence (within Future Organization)",
      "owner": "Muhammad Hasnain Ajmal"
    },
    {
      "id": "trust-gov",
      "name": "Trust & Governance Intelligence",
      "owner": "Kanwal Raveen"
    },
    {
      "id": "cap-validation",
      "name": "Capability Validation",
      "owner": "Zara Fatima"
    },
    {
      "id": "enterprise-validation",
      "name": "Enterprise Validation",
      "owner": "Ammara Nasir"
    },
    {
      "id": "knowledge-ops",
      "name": "Knowledge Operationalization",
      "owner": "Laiba Mahboob"
    },
    {
      "id": "cap-ops",
      "name": "Capability Operationalization",
      "owner": "Abbas Raza"
    },
    {
      "id": "eng-ops",
      "name": "Engineering Operations",
      "owner": "Kamil Ejaz"
    }
  ],
  "jobs": [
    {
      "id": "J-TECH-01",
      "status": "INTEGRATED"
    },
    {
      "id": "J-SIGNAL-01",
      "status": "INTEGRATED"
    },
    {
      "id": "J-ORGFUT-01",
      "status": "INTEGRATED"
    },
    {
      "id": "J-TRUST-01",
      "status": "INTEGRATED"
    },
    {
      "id": "J-VALID-01",
      "status": "INTEGRATED"
    },
    {
      "id": "J-FUTUREORG-01",
      "status": "INTEGRATED"
    },
    {
      "id": "J-ENTVAL-01",
      "status": "INTEGRATED"
    },
    {
      "id": "J-KNOW-01",
      "status": "INTEGRATED"
    },
    {
      "id": "J-CAPOPS-01",
      "status": "RELEASE_READY"
    },
    {
      "id": "J-AIML-01",
      "status": "INTEGRATED"
    }
  ],
  "capabilities": [
    {
      "id": "COP-0001",
      "name": "Automated Compliance Risk Scoring",
      "state": "Conditionally Ready"
    },
    {
      "id": "COP-TEST-07",
      "name": "Test Capability",
      "state": "Validation Reference Missing"
    }
  ],
  "signals": [
    {
      "id": "sig_39956fe626e0285b",
      "title": "Engineering teams embedding AI copilots into daily review workflows",
      "state": "PATTERN_CANDIDATE",
      "orgs": [
        "Contoso Engineering",
        "Northwind Platform Group",
        "Fabrikam Financial"
      ]
    },
    {
      "id": "sig_5de34fd1e79525f4",
      "title": "Organizations rewriting approval policy as machine-checkable guardrails",
      "state": "PATTERN_CANDIDATE",
      "orgs": [
        "Fabrikam Financial",
        "Contoso Engineering"
      ]
    },
    {
      "id": "sig_f91fd27b64072329",
      "title": "Multi-agent orchestration replacing manual work routing",
      "state": "PATTERN_CANDIDATE",
      "orgs": [
        "Northwind Platform Group"
      ]
    },
    {
      "id": "sig_b358cd94ddb8c5ca",
      "title": "Distributed decision authority pushed to autonomous squads",
      "state": "PATTERN_CANDIDATE",
      "orgs": [
        "Fabrikam Financial"
      ]
    },
    {
      "id": "sig_126cbfbcd1480f52",
      "title": "Institutional memory rebuilt as queryable knowledge graphs",
      "state": "IMPACT_ANALYZED",
      "orgs": [
        "Contoso Engineering"
      ]
    },
    {
      "id": "sig_b8fb00ad17aae76a",
      "title": "Design decisions drafted by AI assistant and ratified by human architects",
      "state": "PATTERN_CANDIDATE",
      "orgs": [
        "Fabrikam Financial",
        "Contoso Engineering"
      ]
    },
    {
      "id": "sig_c0f00566deda71cb",
      "title": "Continuous audit trails replacing periodic compliance review cycles",
      "state": "PATTERN_CANDIDATE",
      "orgs": [
        "Fabrikam Financial"
      ]
    }
  ],
  "governance_decisions": [
    {
      "actor": "agent-zeeshan-047",
      "action": "delete_customer_record",
      "risk": "HIGH",
      "outcome": "HUMAN_REVIEW",
      "reason": "Rule R-09 mandates human review for this action, independent of trust score.",
      "evidence_id": "EV-2026-governance-1"
    },
    {
      "actor": "agent-1",
      "action": "read_customer_record",
      "risk": "LOW",
      "outcome": "ALLOW",
      "reason": "Allowed by rule R-01, risk level LOW, no blocking or review rule matched.",
      "evidence_id": "EV-2026-governance-2"
    }
  ]
};
