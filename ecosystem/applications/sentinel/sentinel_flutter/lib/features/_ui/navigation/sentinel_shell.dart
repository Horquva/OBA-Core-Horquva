import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/sentinel_colors.dart';
import '../theme/sentinel_text_styles.dart';
import 'route_names.dart';

/// Sentinel Navigation Shell
/// Owner: Muhammad Anas (Experience Layer)
class SentinelShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const SentinelShell({required this.navigationShell, super.key});

  void _goBranch(int index) {
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF05070D), // Dark background from design
      body: navigationShell,
      floatingActionButton: Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: SentinelColors.primaryGlow.withValues(alpha: 0.3),
              blurRadius: 8,
              spreadRadius: 2,
            )
          ],
        ),
        child: FloatingActionButton(
          onPressed: () => _goBranch(2), // Branch 2 is Overview
          backgroundColor: const Color(0xFF0B101D),
          elevation: 0,
          shape: CircleBorder(
            side: BorderSide(color: SentinelColors.primaryGlow.withValues(alpha: 0.5), width: 1.5),
          ),
          child: const Icon(Icons.security, color: SentinelColors.primaryGlow, size: 28),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: BottomAppBar(
        color: const Color(0xFF0B0F1A),
        shape: const CircularNotchedRectangle(),
        notchMargin: 10,
        height: 70,
        padding: EdgeInsets.zero,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _buildNavItem(Icons.home_filled, 'Command', 0),
            _buildNavItem(Icons.search, 'Investigate', 1),
            const SizedBox(width: 48), // Space for center FAB
            _buildNavItem(Icons.assignment_outlined, 'Incidents', 3),
            _buildNavItem(Icons.more_horiz, 'More', 4),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, int index) {
    final isActive = navigationShell.currentIndex == index;
    final color = isActive ? SentinelColors.primaryGlow : SentinelColors.textSecondary;
    return InkWell(
      onTap: () => _goBranch(index),
      splashColor: Colors.transparent,
      highlightColor: Colors.transparent,
      child: SizedBox(
        width: 60,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 10,
                fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Sentinel Scaffold
class SentinelScaffold extends StatelessWidget {
  final String title;
  final Widget body;
  final List<Widget>? actions;
  final bool showBackButton;

  const SentinelScaffold({
    required this.title,
    required this.body,
    this.actions,
    this.showBackButton = false,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        automaticallyImplyLeading: showBackButton,
        title: title == 'SENTINEL'
            ? Row(
                children: [
                  const Icon(Icons.security, color: SentinelColors.primaryGlow, size: 28),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'SENTINEL',
                        style: TextStyle(
                          fontFamily: 'Space Grotesk',
                          fontWeight: FontWeight.bold,
                          fontSize: 20,
                          letterSpacing: 1.2,
                          color: Colors.white,
                        ),
                      ),
                      Text(
                        'Unified Security Command',
                        style: TextStyle(
                          fontSize: 11,
                          color: SentinelColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ],
              )
            : Text(title, style: SentinelTextStyles.headlineMd),
        actions: actions ?? [
          const CircleAvatar(
            radius: 16,
            backgroundColor: SentinelColors.surfaceHigh,
            backgroundImage: NetworkImage('https://i.pravatar.cc/100?img=11'), // Mock avatar
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: body,
    );
  }
}
