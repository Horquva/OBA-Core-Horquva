# Altair Shell Contract

## Responsibilities

The application shell provides the scaffold for the Altair web experience without claiming authoritative backend behavior.

### Header
- presents product identity and current context
- surfaces global actions such as notifications or search where approved
- remains consistent across routes

### Navigation
- organizes primary route entries
- separates content and feature navigation from system configuration
- supports keyboard and focus-friendly interaction

### Sidebar
- contains secondary or persistent navigation when the viewport supports it
- collapses or reflows for narrow layouts
- does not hold business-authoritative logic

### Main content region
- hosts routed experiences or feature placeholders
- supports standard loading, empty, and error states
- preserves semantic structure for accessibility

## Layout principles

- desktop: sidebar + content region
- tablet: adaptive compact layout
- mobile: stacked or collapsed navigation with readable content width
- no content should overflow without a defined wrapping strategy

## Theme integration

The shell must consume the shared theme tokens from `theme.js` and use semantic colors, radii, spacing, and focus styles rather than arbitrary values.

## Error/loading boundaries

The shell should provide a route-level and data-level fallback area where global states can appear without breaking the structure.

## External dependencies

This shell assumes upstream integration exists outside Altair; therefore any runtime integration such as auth, API fetching, or route activation must be treated as a deferred external contract unless an explicit local adapter is approved.
