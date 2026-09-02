import 'package:flutter/material.dart';
import 'features/_ui/navigation/app_router.dart';
import 'features/_ui/theme/sentinel_theme.dart';

/// Sentinel Flutter Application Bootstrap
///
/// Ownership note:
/// - [sentinelTheme] → Muhammad Anas (Experience Layer)
/// - [sentinelRouter] → Muhammad Anas (UX navigation structure)
///
/// M.Ali will extend this file to:
///   1. Register state management providers (Provider/Riverpod/GetX)
///   2. Add auth redirect guards to sentinelRouter
///   3. Move sentinelRouter to core/routing/app_router.dart per Team Lead rule
///
/// Do NOT add API calls, token logic, or auth checks here — those belong
/// in M.Ali's platform layer.
void main() {
  runApp(const SentinelApp());
}

class SentinelApp extends StatelessWidget {
  const SentinelApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Sentinel',
      debugShowCheckedModeBanner: false,
      theme: sentinelTheme(),
      routerConfig: sentinelRouter,
    );
  }
}
