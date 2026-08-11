# Horquva Mobile App

Engineering Mobile Applications Platform - Flutter Foundation.

## Overview

A scalable, professional Flutter starter architecture following industry best practices for medium-to-large enterprise applications. This is the engineering foundation for an internal platform, built with feature-first Clean Architecture.

## Folder Structure

```
lib/
  core/
    constants/        # App constants, dimensions, route names
    routes/           # GoRouter configuration
    theme/            # Material 3 theming (light/dark)
    utils/            # Validators and utilities
    errors/           # Exception classes
  shared/
    widgets/          # Reusable UI components
    extensions/       # BuildContext extensions
    helpers/          # Date formatting helpers
  features/
    authentication/   # Login screen
    dashboard/        # Main dashboard with stats and activity
    projects/         # Project management screen
    knowledge/        # Documentation and knowledge portal
    notifications/    # Notification center
    profile/          # User profile
    settings/         # App settings
  services/
    injection/        # Dependency injection setup
  main.dart           # Application entry point
```

## Architecture

### Feature-first Clean Architecture

- **Core Layer**: Shared infrastructure, theming, routing, constants
- **Shared Layer**: Reusable widgets, extensions, helpers
- **Features Layer**: Feature-specific presentation screens
- **Services Layer**: Dependency injection, future services

### State Management: flutter_bloc

Bloc is configured at the app level for theme management and ready for feature-level state management.

### Routing: go_router

Centralized routing with ShellRoute for BottomNavigationBar navigation and separate routes for auth and settings.

### Dependency Injection: get_it

Service locator pattern with lazy singleton registration.

## Packages

| Package | Version | Purpose |
|---------|---------|---------|
| flutter_bloc | ^9.1.0 | State management |
| go_router | ^14.8.1 | Declarative routing |
| get_it | ^8.0.3 | Dependency injection |
| flutter_screenutil | ^5.9.3 | Responsive UI |
| google_fonts | ^6.2.1 | Typography |
| equatable | ^2.0.7 | Value equality |

## How to Run

```bash
flutter pub get
flutter run
```

### For iOS

```bash
cd ios && pod install && cd ..
flutter run
```

## Screens

- **Login**: Email/password authentication placeholder
- **Dashboard**: Stats cards, today's tasks, quick actions, recent activity, platform status
- **Projects**: Project cards with status, progress, owner, due dates
- **Knowledge**: Documentation categories, recent documents, quick links
- **Notifications**: Grouped notification list with read/unread states
- **Profile**: Avatar, info, skills, activity
- **Settings**: Dark mode, language, notification preferences, account, about

## Design System

- Material 3 theming with light and dark mode
- Consistent color palette with primary/secondary/semantic colors
- Inter font family via Google Fonts
- Professional spacing and rounded corners
- Responsive layouts via flutter_screenutil

## Future Integrations

- Authentication (OAuth2, SSO)
- REST API integration
- Firebase services
- Local database (SQLite/Hive)
- Push notifications
- Real-time updates
- CI/CD pipeline integration
- Analytics and crash reporting

## Code Quality

- SOLID principles
- Small, focused widgets
- Separation of presentation from business logic
- const constructors
- Lint-friendly code
- Meaningful filenames
