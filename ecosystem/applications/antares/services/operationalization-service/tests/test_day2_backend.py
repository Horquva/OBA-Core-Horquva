import os
from pathlib import Path

DB_PATH = Path('/home/ubuntu/day2_deliverable/antres_knowledge.db')
if DB_PATH.exists():
    DB_PATH.unlink()

from fastapi.testclient import TestClient
from day2_backend_foundation import app

client = TestClient(app)
payload = {
    'id': 'ko-day2-001',
    'title': 'Automated Risk Scoring Protocol',
    'description': 'Validated risk assessment model for real-time fintech lending validation.',
    'category': 'Capability',
    'source': {
        'source_team': 'Enterprise Validation (Ammara)',
        'author_id': 'ammara.lead',
        'source_reference_id': 'REF-VAL-882',
    },
    'validation': {
        'validated_by': 'Kanwal (Trust & Governance)',
        'validation_status': 'APPROVED',
        'confidence_score': 0.98,
        'constitutional_check_passed': True,
    },
    'related_capabilities': ['cap-lend-01'],
    'related_technologies': ['tech-fastapi', 'tech-sqlite'],
    'metadata_tags': {'tier': 'Enterprise', 'security': 'Strict'},
    'version': 1,
    'previous_version_id': None,
}

created = client.post('/api/v1/knowledge', json=payload)
assert created.status_code == 201, created.text
created_body = created.json()
assert created_body['id'] == payload['id']
assert created_body['source']['source_reference_id'] == 'REF-VAL-882'
assert created_body['is_active'] is True
assert created_body['ingested_at']
print('PASS: POST ingestion and response contract')

retrieved = client.get('/api/v1/knowledge/ko-day2-001')
assert retrieved.status_code == 200, retrieved.text
assert retrieved.json()['title'] == payload['title']
print('PASS: GET retrieval')

listed = client.get('/api/v1/knowledge')
assert listed.status_code == 200, listed.text
assert any(item['id'] == 'ko-day2-001' for item in listed.json())
print('PASS: GET listing')

duplicate = client.post('/api/v1/knowledge', json=payload)
assert duplicate.status_code == 400, duplicate.text
print('PASS: duplicate ID protection')

missing = client.get('/api/v1/knowledge/does-not-exist')
assert missing.status_code == 404, missing.text
print('PASS: missing object returns 404')

invalid = dict(payload)
invalid['id'] = 'ko-day2-invalid'
invalid['validation'] = dict(payload['validation'])
invalid['validation']['confidence_score'] = 1.5
invalid_response = client.post('/api/v1/knowledge', json=invalid)
assert invalid_response.status_code == 422, invalid_response.text
print('PASS: invalid confidence rejected with 422')

print('PASS: Day 2 backend integration test suite')
