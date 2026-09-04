import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'core/bindings/app_binding.dart';
import 'features/_ui/navigation/app_router.dart';
import 'features/_ui/theme/sentinel_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SentinelApp());
}

class SentinelApp extends StatelessWidget {
  const SentinelApp({super.key});

  @override
  Widget build(BuildContext context) {
    return GetMaterialApp.router(
      title: 'Sentinel',
      debugShowCheckedModeBanner: false,
      theme: sentinelTheme(),
      routeInformationParser: sentinelRouter.routeInformationParser,
      routerDelegate: sentinelRouter.routerDelegate,
      routeInformationProvider: sentinelRouter.routeInformationProvider,
      initialBinding: AppBinding(),
    );
  }
}
