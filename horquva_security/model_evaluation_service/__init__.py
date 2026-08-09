"""
model-evaluation-service

Evaluates a model/agent-behavior sample against a checklist of
safety/quality criteria and produces a scored, machine-readable
EvaluationResult. This is a static/offline-style evaluation (given a
sample of outputs), not a live guardrail on a single request — that's
guardrail-engine's job.
"""
