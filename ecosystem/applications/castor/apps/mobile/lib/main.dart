import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'core/app_platform.dart';
import 'theme/app_colors.dart';
import 'theme/app_theme.dart';
import 'views/screens/app_shell.dart';

void main() {
  runApp(const CastorApp());
}

/// Root widget of the Castor app.
///
/// Platform-adaptive: on iOS it runs a [CupertinoApp] (iOS-style page
/// transitions and scroll feel), on Android a [MaterialApp]. Both keep the
/// same Castor look because the shared screens use the Material theme.
class CastorApp extends StatelessWidget {
  const CastorApp({super.key});

  @override
  Widget build(BuildContext context) {
    if (AppPlatform.isIOS) {
      return CupertinoApp(
        title: 'Castor',
        debugShowCheckedModeBanner: false,
        // Material localizations are needed because the shared screens use
        // Material widgets (Scaffold, InkWell) inside the Cupertino app.
        localizationsDelegates: const [
          DefaultMaterialLocalizations.delegate,
          DefaultCupertinoLocalizations.delegate,
          DefaultWidgetsLocalizations.delegate,
        ],
        theme: const CupertinoThemeData(
          primaryColor: AppColors.primary,
          brightness: Brightness.light,
        ),
        // Provide the Material theme so Scaffold-based screens keep the Castor
        // colours (cream background, etc.) while running under Cupertino.
        builder: (context, child) =>
            Theme(data: AppTheme.light, child: child ?? const SizedBox()),
        home: const AppShell(),
      );
    }

    return MaterialApp(
      title: 'Castor',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const AppShell(),
    );
  }
}
