import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import '../../core/app_platform.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../widgets/bottom_nav_bar.dart';
import 'ask_castor_screen.dart';
import 'briefing_screen.dart';
import 'decisions_screen.dart';
import 'more_sheet.dart';
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

  // True while the "More" popup is open, so the More tab shows as selected.
  bool _moreOpen = false;

  // Which "More" destination is currently open (shown in the body), or null.
  int? _moreIndex;

  @override
  Widget build(BuildContext context) {
    // The three main tabs (Overview, Briefing, Signals).
    const screens = <Widget>[
      OverviewScreen(),
      BriefingScreen(),
      SignalsScreen(),
    ];

    // The body: a "More" destination if one is open, otherwise the active tab.
    final Widget body =
        _moreIndex != null ? _moreScreen(_moreIndex!) : screens[_index];

    final Widget nav = BottomNavBar(
      // Highlight "More" (index 3) while its popup is open OR a More screen is
      // showing; otherwise highlight the active tab.
      currentIndex: (_moreOpen || _moreIndex != null) ? 3 : _index,
      onTap: (i) => _onNavTap(context, i),
      onCastorTap: () => _openAskCastor(context),
    );

    // Platform-adaptive shell: a CupertinoPageScaffold on iOS, a Material
    // Scaffold on Android. The custom bottom nav is used on both.
    if (AppPlatform.isIOS) {
      return CupertinoPageScaffold(
        backgroundColor: AppColors.background,
        child: Column(
          children: [
            Expanded(child: body),
            nav,
          ],
        ),
      );
    }

    return Scaffold(
      body: body,
      bottomNavigationBar: nav,
    );
  }

  /// Handles a bottom-nav tab tap: a main tab switches the body, "More" (3)
  /// opens the wheel.
  void _onNavTap(BuildContext context, int i) {
    if (i == 3) {
      _openMore(context);
    } else {
      setState(() {
        _index = i;
        _moreIndex = null;
      });
    }
  }

  /// Opens the More wheel and applies the chosen destination.
  Future<void> _openMore(BuildContext context) async {
    setState(() => _moreOpen = true);
    final tapped = await showMoreSheet(context, selectedIndex: _moreIndex);
    if (!mounted) return;
    setState(() {
      _moreOpen = false;
      if (tapped != null) _moreIndex = tapped;
    });
  }

  /// Opens the Ask Castor screen (adaptive route) from the centre button. It
  /// carries its own nav bar; tapping a tab pops it and switches the shell.
  void _openAskCastor(BuildContext context) {
    void onNavTap(int i) {
      Navigator.of(context).pop(); // close Ask Castor
      _onNavTap(context, i);
    }

    final route = AppPlatform.isIOS
        ? CupertinoPageRoute<void>(
            builder: (_) => AskCastorScreen(onNavTap: onNavTap),
          )
        : MaterialPageRoute<void>(
            builder: (_) => AskCastorScreen(onNavTap: onNavTap),
          );
    Navigator.of(context).push(route);
  }

  /// Builds the screen for an open "More" destination. The back button clears
  /// the More section (returns to the last main tab).
  Widget _moreScreen(int index) {
    switch (index) {
      case 0: // Decisions
        return DecisionsScreen(
          onBack: () => setState(() => _moreIndex = null),
        );
      default:
        return const _PlaceholderScreen(title: 'Coming soon');
    }
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
