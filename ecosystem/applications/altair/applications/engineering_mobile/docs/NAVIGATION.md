# Navigation

## Router Configuration

Navigation uses **go_router** with a centralized router defined in `lib/core/routes/app_router.dart`.

## Route Structure

```
/login                  → LoginScreen
/settings               → SettingsScreen (pushed on top)
/shell                  → ShellRoute (BottomNavigationBar)
  /dashboard            → DashboardScreen
  /projects             → ProjectsScreen
  /knowledge            → KnowledgeScreen
  /notifications        → NotificationsScreen
  /profile              → ProfileScreen
```

## Navigation Bar

The bottom navigation uses Material 3's `NavigationBar` with five destinations:

| Index | Tab | Route |
|-------|-----|-------|
| 0 | Dashboard | /dashboard |
| 1 | Projects | /projects |
| 2 | Knowledge | /knowledge |
| 3 | Alerts | /notifications |
| 4 | Profile | /profile |

## ShellRoute

`ShellRoute` wraps the main tabs, providing a persistent `Scaffold` with `AppBar` and `NavigationBar` while swapping the body content based on the active route.

## Deep Linking

The router supports deep linking out of the box. Routes can be navigated to directly:

```dart
context.go('/projects');
context.push('/settings');
context.goNamed('dashboard');
```

## Navigation Actions

- **Settings** is pushed as a separate route (not a tab) via the settings icon in the app bar
- **Login** redirects to the shell after successful authentication (future implementation)
