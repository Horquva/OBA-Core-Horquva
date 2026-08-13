# Altair Accessibility Foundation

## Baseline rules

- Use semantic elements for structure: `nav`, `main`, `aside`, `header`, `section`, `button`.
- Ensure all interactive controls have accessible names.
- Maintain visible focus styling using the theme focus tokens.
- Provide labels for form fields and avoid placeholder-only text.
- Keep keyboard navigation predictable.
- Ensure error and loading states are announced through accessible messaging where possible.

## Interaction requirements

- Buttons must be keyboard focusable.
- Dialog and alert surfaces should use understandable semantics.
- Navigation items must behave consistently and be readable.
- Status changes should not depend only on color.

## Limitations

This foundation establishes reusable accessibility patterns, but actual user-facing configuration or assistive-technology integration may require upstream app-level wiring outside Altair.
