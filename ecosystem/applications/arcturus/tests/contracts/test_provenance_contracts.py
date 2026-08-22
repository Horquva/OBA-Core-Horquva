"""
Tests for Provenance & Deterministic Lineage Contracts (Day 0 foundation).
"""
import pytest
from uuid import uuid4
from ecosystem.applications.arcturus.contracts.provenance.base_models import (
    ProvenanceRecord,
    generate_lineage_hash,
)


def test_generate_lineage_hash_deterministic():
    hash1 = generate_lineage_hash(
        experiment_id="exp-100",
        seed=42,
        tick=10,
        event_id="evt-01",
        entity_id="agent-07",
        parent_hashes=["hash_a", "hash_b"],
    )
    hash2 = generate_lineage_hash(
        experiment_id="exp-100",
        seed=42,
        tick=10,
        event_id="evt-01",
        entity_id="agent-07",
        parent_hashes=["hash_b", "hash_a"],  # Order in list shouldn't matter due to sorted()
    )
    assert hash1 == hash2
    assert len(hash1) == 64  # SHA-256 hex digest length


def test_generate_lineage_hash_sensitivity():
    base_hash = generate_lineage_hash("exp-100", 42, 10, "evt-01")
    diff_seed = generate_lineage_hash("exp-100", 43, 10, "evt-01")
    diff_tick = generate_lineage_hash("exp-100", 42, 11, "evt-01")
    diff_event = generate_lineage_hash("exp-100", 42, 10, "evt-02")

    assert base_hash != diff_seed
    assert base_hash != diff_tick
    assert base_hash != diff_event


def test_provenance_record_create():
    run_id = uuid4()
    record = ProvenanceRecord.create(
        experiment_id="exp-100",
        run_id=run_id,
        seed=42,
        tick=5,
        event_id="evt-55",
        entity_id="team-03",
        parent_hashes=["anc_1"],
        metadata={"platform": "workforce"},
    )
    assert record.experiment_id == "exp-100"
    assert record.run_id == run_id
    assert record.seed == 42
    assert record.tick == 5
    assert record.event_id == "evt-55"
    assert record.entity_id == "team-03"
    assert len(record.lineage_hash) == 64
    assert record.metadata["platform"] == "workforce"
