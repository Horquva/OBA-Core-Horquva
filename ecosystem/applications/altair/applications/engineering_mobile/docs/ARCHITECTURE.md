# Architecture

## Overview

The Horquva Mobile App follows **Feature-first Clean Architecture**, organizing code by feature modules while maintaining clear separation of concerns across layers.

## Layer Architecture

### Core Layer (`lib/core/`)

Foundation layer shared across all features.

- **constants/**: Application-wide constants (dimensions, route names, app metadata)
- **routes/**: GoRouter configuration defining all navigation paths
- **theme/**: Material 3 theming system with light and dark variants
- **utils/**: Utility classes like validators
- **errors/**: Exception hierarchy for different error types

### Shared Layer (`lib/shared/`)

Reusable components that can be used by any feature.

- **widgets/**: Eight reusable widget components (AppButton, AppTextField, AppCard, SectionTitle, LoadingIndicator, AppErrorWidget, EmptyState, CustomScaffold)
- **extensions/**: BuildContext extensions for theme access, screen dimensions, and snackbar display
- **helpers/**: Utility helpers like date formatting

### Features Layer (`lib/features/`)

Feature-specific code organized by domain.

Each feature contains only a `presentation/` layer for now:
- **screens/**: Feature screens built with shared widgets

### Services Layer (`lib/services/`)

Infrastructure services.

- **injection/**: GetIt dependency injection container setup

## Data Flow

```
User Input → Screen (Widget) → Bloc (State) → Repository (Future)
```

Currently, screens display placeholder data. The pattern supports inserting Bloc/Repository layers between UI and data sources.

## Dependency Rule

Dependencies point inward: Features → Shared → Core.

No feature imports another feature directly. All cross-feature communication happens through the shared layer.
