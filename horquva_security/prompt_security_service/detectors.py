"""
Direct / indirect injection + instruction-conflict + suspicious-pattern
detectors. Direct = the user themselves is trying to override behavior.
Indirect = injected content is arriving via a non-user source (a
document, a tool result) and impersonating an instruction.
"""

from __future__ import annotations
import re

DIRECT_INJECTION_PATTERNS = [
    r"ignore (all )?(previous|prior|above) instructions",
    r"disregard (all )?(previous|prior|above) instructions",
    r"you are now\b",
    r"reveal (your|the) system prompt",
    r"override (your|the) (rules|guidelines|instructions|policy)",
    r"jailbreak",
    r"\bdan mode\b",
    r"developer mode",
]

INDIRECT_INJECTION_MARKERS = [
    r"\bAI\b,? (please|now)\b",
    r"\bassistant,? (please|now)\b",
    r"attention (ai|assistant|model)",
    r"\[system\]",
    r"<\s*system\s*>",
    r"end of (document|article)\.?\s*(new|now) instructions",
]

INSTRUCTION_CONFLICT_PATTERNS = [
    r"instead,? do\b",
    r"actually,? ignore that and\b",
    r"the (real|true) instructions are\b",
]

SUSPICIOUS_PATTERNS = [
    r"base64:",
    r"\\x[0-9a-fA-F]{2}",  # escaped hex sequences, common obfuscation
    r"decode this and run it",
]

_DIRECT = [re.compile(p, re.IGNORECASE) for p in DIRECT_INJECTION_PATTERNS]
_INDIRECT = [re.compile(p, re.IGNORECASE) for p in INDIRECT_INJECTION_MARKERS]
_CONFLICT = [re.compile(p, re.IGNORECASE) for p in INSTRUCTION_CONFLICT_PATTERNS]
_SUSPICIOUS = [re.compile(p, re.IGNORECASE) for p in SUSPICIOUS_PATTERNS]


def _scan(text: str, patterns: list[re.Pattern]) -> list[tuple[str, str]]:
    out = []
    for p in patterns:
        m = p.search(text)
        if m:
            out.append((p.pattern, m.group(0)))
    return out


def scan_direct_injection(text: str) -> list[tuple[str, str]]:
    return _scan(text, _DIRECT)


def scan_indirect_injection(text: str) -> list[tuple[str, str]]:
    return _scan(text, _INDIRECT)


def scan_instruction_conflict(text: str) -> list[tuple[str, str]]:
    return _scan(text, _CONFLICT)


def scan_suspicious_patterns(text: str) -> list[tuple[str, str]]:
    return _scan(text, _SUSPICIOUS)


def sanitize(text: str) -> str:
    """Strip null bytes and collapse excessive whitespace. Does not
    remove flagged phrases — those are for review, not silent editing,
    since silently rewriting an untrusted document is its own risk."""
    cleaned = text.replace("\x00", "")
    cleaned = re.sub(r"[ \t]{3,}", "  ", cleaned)
    return cleaned.strip()
