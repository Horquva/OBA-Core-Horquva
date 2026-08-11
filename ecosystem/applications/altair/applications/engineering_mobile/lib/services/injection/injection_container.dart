import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/routes/app_router.dart';

final sl = GetIt.instance;

Future<void> initializeDependencies() async {
  WidgetsFlutterBinding.ensureInitialized();

  sl.registerLazySingleton<ThemeData>(() => AppTheme.defaultTheme);
  sl.registerLazySingleton<GoRouter>(() => AppRouter.router);
}
