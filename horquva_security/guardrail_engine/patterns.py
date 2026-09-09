"""
Heuristic detection patterns for guardrail-engine.

These are defensive classifiers (detect & flag), not an exhaustive
security boundary on their own — per the W3 spec this is one signal
that feeds risk classification, alongside policy evaluation and
(later) model-based detection from prompt-security-service. Treat as
a first line of defense that will be tuned with real evidence from
AI Red Teaming once that workstream produces regression cases.
"""

from __future__ import annotations

import re

# Phrases commonly used to try to override, bypass, or extract a
# system prompt / prior instructions. Kept as a plain list (not a
# giant enumerated taxonomy) so it's easy for the team to extend as
# red-team findings come in, per "Attack -> Finding -> ... -> Guardrail".
INJECTION_PHRASES: list[str] = [
    r"ignore (all )?(previous|prior|above) instructions",
    r"disregard (all )?(previous|prior|above) instructions",
    r"forget (all )?(previous|prior|your) instructions",
    r"you are now\b",
    r"act as (if )?you (are|were)\b",
    r"reveal (your|the) system prompt",
    r"print (your|the) system prompt",
    r"what (is|are) your (system|initial) (prompt|instructions)",
    r"new instructions?:",
    r"override (your|the) (rules|guidelines|instructions|policy)",
    r"do anything now",
    r"jailbreak",
    r"pretend (you|that) (have no|do not have) (restrictions|rules|guardrails)",
    r"bypass (your|the) (safety|security|content) (filter|policy|guardrails)",
    r"\bdan mode\b",
    r"developer mode",
]

_COMPILED = [re.compile(p, re.IGNORECASE) for p in INJECTION_PHRASES]

# Markers that suggest content was retrieved from an external / untrusted
# source and is trying to address the agent directly rather than being
# inert data (a strong signal of indirect prompt injection).
UNTRUSTED_ADDRESS_MARKERS: list[str] = [
    r"\bAI\b,? (please|now)\b",
    r"\bassistant,? (please|now)\b",
    r"attention (ai|assistant|model)",
    r"to the (ai|assistant|model) reading this",
]

_UNTRUSTED_COMPILED = [re.compile(p, re.IGNORECASE) for p in UNTRUSTED_ADDRESS_MARKERS]

# Very small denylist of characters/sequences that indicate malformed
# or control-character-laden input, distinct from injection intent.
CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def find_injection_matches(text: str) -> list[tuple[str, str]]:
    """Return (pattern, matched snippet) pairs for injection phrasing."""
    matches: list[tuple[str, str]] = []
    for pattern in _COMPILED:
        m = pattern.search(text)
        if m:
            matches.append((pattern.pattern, m.group(0)))
    return matches


def find_untrusted_address_matches(text: str) -> list[tuple[str, str]]:
    matches: list[tuple[str, str]] = []
    for pattern in _UNTRUSTED_COMPILED:
        m = pattern.search(text)
        if m:
            matches.append((pattern.pattern, m.group(0)))
    return matches


def has_control_characters(text: str) -> bool:
    return bool(CONTROL_CHAR_RE.search(text))
