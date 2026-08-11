# Folder Structure

## Complete Directory Layout

```
horquva_mobile_app/
├── lib/
│   ├── core/
│   │   ├── constants/
│   │   │   ├── app_constants.dart        # App name, version, organization
│   │   │   ├── app_dimensions.dart       # Spacing, radius, icon sizes
│   │   │   └── route_names.dart          # Route name constants
│   │   ├── routes/
│   │   │   └── app_router.dart           # GoRouter configuration
│   │   ├── theme/
│   │   │   ├── app_colors.dart           # Color palette
│   │   │   ├── app_theme.dart            # Theme accessors
│   │   │   ├── app_typography.dart       # Text style definitions
│   │   │   ├── light_theme.dart          # Light theme data
│   │   │   └── dark_theme.dart           # Dark theme data
│   │   ├── utils/
│   │   │   └── validators.dart           # Form validation
│   │   └── errors/
│   │       └── app_exceptions.dart       # Exception classes
│   ├── shared/
│   │   ├── widgets/
│   │   │   ├── app_button.dart           # Reusable button component
│   │   │   ├── app_text_field.dart       # Reusable text field
│   │   │   ├── app_card.dart             # Reusable card container
│   │   │   ├── section_title.dart        # Section header with optional subtitle
│   │   │   ├── loading_indicator.dart    # Loading spinner
│   │   │   ├── app_error_widget.dart     # Error display with retry
│   │   │   ├── empty_state.dart          # Empty state placeholder
│   │   │   └── custom_scaffold.dart      # Custom scaffold wrapper
│   │   ├── extensions/
│   │   │   └── context_extensions.dart   # BuildContext extensions
│   │   └── helpers/
│   │       └── date_helper.dart          # Date formatting utilities
│   ├── features/
│   │   ├── authentication/
│   │   │   └── presentation/
│   │   │       └── screens/
│   │   │           └── login_screen.dart
│   │   ├── dashboard/
│   │   │   └── presentation/
│   │   │       └── screens/
│   │   │           └── dashboard_screen.dart
│   │   ├── projects/
│   │   │   └── presentation/
│   │   │       └── screens/
│   │   │           └── projects_screen.dart
│   │   ├── knowledge/
│   │   │   └── presentation/
│   │   │       └── screens/
│   │   │           └── knowledge_screen.dart
│   │   ├── notifications/
│   │   │   └── presentation/
│   │   │       └── screens/
│   │   │           └── notifications_screen.dart
│   │   ├── profile/
│   │   │   └── presentation/
│   │   │       └── screens/
│   │   │           └── profile_screen.dart
│   │   └── settings/
│   │       └── presentation/
│   │           └── screens/
│   │               └── settings_screen.dart
│   ├── services/
│   │   └── injection/
│   │       └── injection_container.dart
│   └── main.dart
├── docs/
│   ├── ARCHITECTURE.md
│   ├── NAVIGATION.md
│   ├── THEME.md
│   ├── STATE_MANAGEMENT.md
│   ├── DEPENDENCY_INJECTION.md
│   └── FOLDER_STRUCTURE.md
├── test/
│   └── widget_test.dart
├── pubspec.yaml
└── README.md
```

## Key Principles

- **Feature-first**: Code organized by business domain
- **Separation of concerns**: Each layer has a specific responsibility
- **Reusability**: Shared widgets reduce duplication
- **Scalability**: Adding new features follows established patterns
