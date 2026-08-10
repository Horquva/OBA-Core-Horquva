# Sentinel Security Quality & Compliance Platform

## Overview

This module implements Sentinel's Security Quality & Compliance Platform as a modular-monolith-first verification control plane.

The platform is responsible for independently verifying whether Sentinel security capabilities are sufficiently tested, evidenced, trustworthy, and eligible for release.

It does not replace other Sentinel security platforms. Identity & Trust, Application Security, Infrastructure Security, AI Security, and DevSecOps remain responsible for building and operating their own security controls. This platform independently verifies those controls and their supporting evidence.

## Implemented Capabilities

### Assessment
- Create security assessments
- Validate scope and risk tier
- Enforce requester roles
- Persist assessment state
- Govern assessment lifecycle transitions
- Produce audit records

### Test Management
- Create test plans
- Register test cases
- Record PASS / FAIL / ERROR results
- Require failure classification for failed tests
- Track retest requirements

### Finding Management
- Register findings
- Assign severity and owner
- Record remediation
- Enforce finding lifecycle transitions
- Reject invalid lifecycle transitions
- Preserve lifecycle audit records

### Evidence
- Register evidence
- Link evidence to assessments
- Store SHA-256 hashes
- Record provenance and collector identity
- Verify evidence integrity
- Reject tampered evidence
- Audit evidence creation and verification

### Compliance & Controls
- Maintain internal security control catalogue
- Map controls to framework references
- Mark controls mandatory or optional
- Evaluate controls as PASS / FAIL / EXCEPTION

External frameworks are treated as readiness mappings only and do not represent a claim of external certification.

### Exception Governance
- Record affected control
- Record reason and risk
- Record scope
- Record compensating control
- Record risk owner and approver
- Track start and expiry dates
- Enforce exception lifecycle transitions

### Trust
- Create trust states for assessed subjects
- Enforce TRUSTED → AT_RISK → DEGRADED → REVOKED lifecycle
- Store trust reasons
- Support re-verification deadlines
- Audit trust transitions

### Regression
- Create regression cases
- Link regression cases to source findings
- Record regression execution results
- Preserve protection for previously discovered weaknesses

### Scorecard
Calculates:

- Quality score
- Risk score
- Compliance score
- Trust score
- Evidence health score
- Overall assurance score

Scorecards inform verification decisions but do not independently certify systems.

### Certification & Release Gate
- Create certification records
- Move certifications into governed review
- Enforce certification state transitions
- Block certification/release when:
  - critical unresolved findings exist
  - mandatory controls fail
  - required evidence is missing
  - evidence integrity is unverified
  - trust is revoked
- Produce machine-readable release decisions

### Audit
- Record assessment creation
- Record lifecycle transitions
- Record evidence creation and verification
- Expose audit records through API

## Core Domain Entities

The platform persists:

1. Assessment
2. Test Plan
3. Test Case
4. Finding
5. Evidence
6. Control
7. Exception
8. Certification
9. Trust State
10. Regression Case
11. Scorecard
12. Audit Record

## Governed State Machines

### Assessment

REQUESTED → TRIAGED → PLANNED → IN_TESTING → FINDINGS_REVIEW → REMEDIATION_RETEST → COMPLIANCE_REVIEW → CERTIFICATION

### Finding

OPEN → TRIAGED → ASSIGNED → REMEDIATION → RETEST → VERIFIED → CLOSED

### Trust

TRUSTED → AT_RISK → DEGRADED → REVOKED

### Certification

ELIGIBLE → UNDER_REVIEW → APPROVED / CONDITIONAL / REJECTED → EXPIRED

### Exception

REQUESTED → REVIEW → APPROVED → ACTIVE → EXPIRING → EXPIRED / REVOKED

Invalid transitions are rejected.

## Technology

- Python 3
- FastAPI
- SQLAlchemy
- SQLite for local MVP persistence
- Pydantic
- Pytest

## Run Locally

From:

```bash
ecosystem/applications/sentinel
