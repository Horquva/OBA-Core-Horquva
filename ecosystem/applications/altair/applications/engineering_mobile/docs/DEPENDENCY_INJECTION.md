# Dependency Injection

## Approach

Dependency injection uses **get_it** as a service locator, defined in `lib/services/injection/injection_container.dart`.

## Container Setup

```dart
final sl = GetIt.instance;

Future<void> initializeDependencies() async {
  WidgetsFlutterBinding.ensureInitialized();
  sl.registerLazySingleton<ThemeData>(() => AppTheme.defaultTheme);
  sl.registerLazySingleton<GoRouter>(() => AppRouter.router);
}
```

## Usage

```dart
// Access registered services
final router = sl<GoRouter>();
final theme = sl<ThemeData>();

// In MaterialApp.router
routerConfig: sl<GoRouter>(),
```

## Registration Patterns

| Pattern | Method | When to Use |
|---------|--------|-------------|
| Singleton | `registerLazySingleton` | One instance, created on first access |
| Factory | `registerFactory` | New instance every time |
| Singleton (eager) | `registerSingleton` | One instance, created immediately |

## Best Practices

- Keep injection container in a single file for the app layer
- Register dependencies before `runApp()` is called
- Use `registerFactory` for Blocs (new instance per navigation)
- Use `registerLazySingleton` for services (database, API clients)
- Avoid circular dependencies by design

## Future Service Registration

```dart
Future<void> initializeDependencies() async {
  // Core
  sl.registerLazySingleton<GoRouter>(() => AppRouter.router);

  // Data sources
  sl.registerLazySingleton<ApiClient>(() => ApiClient());
  sl.registerLazySingleton<LocalDatabase>(() => LocalDatabase());

  // Repositories
  sl.registerLazySingleton<ProjectRepository>(() => ProjectRepositoryImpl(
    remoteDataSource: sl(),
    localDataSource: sl(),
  ));

  // Blocs
  sl.registerFactory(() => ProjectsBloc(repository: sl()));
}
```
