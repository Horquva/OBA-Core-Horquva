"""
agent-identity-service

Registration, credentials, trust levels, verification/re-verification,
and identity lifecycle for AI agents. Integrates with Sentinel Identity
for the org-wide identity system rather than duplicating it — this
service only holds AGENT-specific identity state (trust level,
credential lifecycle, verification), not general user/org identity.
"""
