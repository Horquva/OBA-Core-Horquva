# State Management

## Approach

State management uses **flutter_bloc** for predictable, testable state management.

## Current Implementation

### ThemeCubit

A simple Cubit in `main.dart` manages the app's theme mode (light/dark):

```dart
class ThemeCubit extends Cubit<ThemeMode> {
  ThemeCubit() : super(ThemeMode.light);

  void toggleTheme() {
    emit(state == ThemeMode.light ? ThemeMode.dark : ThemeMode.light);
  }

  void setTheme(ThemeMode mode) {
    emit(mode);
  }
}
```

## Adding Feature Blocs

To add state management for a feature:

1. Create `bloc/` directory under the feature
2. Define `Event`, `State`, and `Bloc` classes
3. Register in injection container
4. Provide via `BlocProvider` or `BlocProvider.value`

### Example pattern:

```dart
// lib/features/projects/presentation/bloc/projects_bloc.dart
class ProjectsBloc extends Bloc<ProjectsEvent, ProjectsState> {
  final ProjectsRepository repository;

  ProjectsBloc({required this.repository}) : super(ProjectsInitial()) {
    on<LoadProjects>(_onLoadProjects);
  }
}
```

## Best Practices

- One Bloc per feature/screen
- Events represent user actions or system triggers
- States represent distinct UI states (initial, loading, loaded, error)
- Use `Equatable` for state and event classes
- Keep Blocs pure (no UI dependencies)
