import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import '../../core/app_platform.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../widgets/bottom_nav_bar.dart';
import 'overview_screen.dart';
import 'signals_screen.dart';

/// The application shell: one Scaffold that hosts the bottom navigation and
/// swaps the active screen. This is what makes Castor a single unified app
/// rather than separate demo screens.
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    // The four bottom-nav tabs.
    const screens = <Widget>[
      OverviewScreen(),
      _PlaceholderScreen(title: 'Briefing'),
      SignalsScreen(),
      _PlaceholderScreen(title: 'More'),
    ];

    final Widget nav = BottomNavBar(
      currentIndex: _index,
      onTap: (i) => setState(() => _index = i),
      onCastorTap: () {}, // Ask Castor screen comes later.
    );

    // Platform-adaptive shell: a CupertinoPageScaffold on iOS, a Material
    // Scaffold on Android. The custom bottom nav is used on both.
    if (AppPlatform.isIOS) {
      return CupertinoPageScaffold(
        backgroundColor: AppColors.background,
        child: Column(
          children: [
            Expanded(child: screens[_index]),
            nav,
          ],
        ),
      );
    }

    return Scaffold(
      body: screens[_index],
      bottomNavigationBar: nav,
    );
  }
}

/// A simple "coming soon" placeholder for tabs not built yet.
class _PlaceholderScreen extends StatelessWidget {
  const _PlaceholderScreen({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(title, style: AppTypography.headingLarge),
            const SizedBox(height: AppSpacing.sm),
            Text('Coming soon', style: AppTypography.bodyMedium),
          ],
        ),
      ),
    );
  }
}
