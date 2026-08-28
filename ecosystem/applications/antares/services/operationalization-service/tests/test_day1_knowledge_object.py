import importlib.util
import json
from pathlib import Path

module_path = Path(__file__).resolve().parent / 'day1_knowledge_object.py'
spec = importlib.util.spec_from_file_location('day1_impl', module_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

KnowledgeObject = module.KnowledgeObject
KnowledgeSource = module.KnowledgeSource
ValidationReference = module.ValidationReference

source = KnowledgeSource(
    source_team='Test Team',
    author_id='tester',
    source_reference_id='TEST-001',
)
validation = ValidationReference(
    validated_by='Governance',
    validation_status='APPROVED',
    confidence_score=0.8,
)
obj = KnowledgeObject(
    id='ko-test-001',
    title='Test knowledge',
    description='A test object',
    category='Capability',
    source=source,
    validation=validation,
)
assert obj.source.ingested_at.tzinfo is not None
assert obj.validation.confidence_score == 0.8
payload = json.loads(obj.model_dump_json())
assert payload['id'] == 'ko-test-001'
assert payload['source']['source_reference_id'] == 'TEST-001'

checks = []
for label, factory in [
    ('confidence below zero', lambda: ValidationReference(validated_by='G', validation_status='APPROVED', confidence_score=-0.1)),
    ('confidence above one', lambda: ValidationReference(validated_by='G', validation_status='APPROVED', confidence_score=1.1)),
    ('missing source reference', lambda: KnowledgeSource(source_team='T', author_id='A')),
]:
    try:
        factory()
    except Exception:
        checks.append(label)
    else:
        raise AssertionError(f'Expected validation failure: {label}')

print('PASS: valid object construction and JSON serialization')
print('PASS: rejected ' + ', '.join(checks))
print('PASS: timezone-aware ingested_at')
