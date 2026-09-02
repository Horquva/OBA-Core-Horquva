# Design System Gap Log

Per Castor v1.0 Part C.3: this component set must consume canonical Castor Design
System primitives and must not introduce a parallel/competing token standard.
This reference implementation was built **outside** the locked Castor repository,
so it does not yet have access to the real Design System tokens. Every value below
is a **placeholder** standing in for a real token, recorded here rather than
silently treated as final.

## Tokens currently used as placeholders

| Placeholder (CSS custom property) | Used in | Needs to become |
|---|---|---|
| `--color-text-secondary` | `AsyncState`, `layout.css` | Design System text/secondary color token |
| `--color-error` | `AsyncState` | Design System semantic/error color token |
| `--space-1` … `--space-6` | `layout.css`, `navigation.css` | Design System spacing scale (Spec 01 §4 defines the 4/8/12/16/24/32/48/64 ramp — must map 1:1 to the real scale, not redefine it) |
| Typography (`font-size`, `line-height` in `layout.css`) | `Container`, headings | Design System type scale + `clamp()` fluid tokens |
| Border radius on cards/buttons in demo `App.jsx` | Demo only | Design System radius token |

## Action required before merge into locked repo

1. Replace every placeholder custom property above with the real Design System
   token name (do not rename the token, just repoint the value).
2. Delete any placeholder definition once the real token exists — no dual
   sources of truth for the same value (Spec 01 §8: "no competing spacing/
   typography scale may be introduced outside this system").
3. If a required primitive does not exist yet in the Design System (e.g. no
   semantic error color), escalate to the Design System Platform per Part C.3 —
   do not invent one locally as a permanent fix.

Status: **Gap identified and logged, not yet resolved** — resolution depends on
access to the real Design System package, which this reference build does not have.
