import 'package:flutter/material.dart';

import '../../core/adaptive_tap.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_icons.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Castor Design System — Bottom Navigation Bar (mobile).
///
/// Shows four tabs (Overview, Briefing, Signals, More) with a central green
/// "Ask Castor" star button in the middle.
///
/// The active tab is decided by [currentIndex] (0..3). Tapping a tab calls
/// [onTap] with its index; tapping the centre star calls [onCastorTap].
class BottomNavBar extends StatelessWidget {
  const BottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
    required this.onCastorTap,
  });

  /// The index of the active tab (0..3).
  final int currentIndex;

  /// Called when a tab is tapped, with its index.
  final ValueChanged<int> onTap;

  /// Called when the central Castor star is tapped.
  final VoidCallback onCastorTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
          child: Row(
            children: [
              _item(icon: AppIcons.overview, label: 'Overview', index: 0),
              _item(icon: AppIcons.briefing, label: 'Briefing', index: 1),
              _castorButton(),
              _item(icon: AppIcons.signals, label: 'Signals', index: 2),
              _item(icon: AppIcons.more, label: 'More', index: 3),
            ],
          ),
        ),
      ),
    );
  }

  /// One tab: icon + label, coloured green when active, grey when not.
  Widget _item({
    required IconData icon,
    required String label,
    required int index,
  }) {
    final bool active = index == currentIndex;
    final Color color = active ? AppColors.primary : AppColors.textSecondary;

    // Expanded gives every slot an equal share of the row width.
    return Expanded(
      child: AdaptiveTap(
        onTap: () => onTap(index),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 22, color: color),
              const SizedBox(height: AppSpacing.xs),
              Text(label, style: AppTypography.caption.copyWith(color: color)),
            ],
          ),
        ),
      ),
    );
  }

  /// The central green star button ("Ask Castor").
  Widget _castorButton() {
    return Expanded(
      child: Center(
        child: AdaptiveTap(
          onTap: onCastorTap,
          borderRadius: BorderRadius.circular(26),
          child: Container(
            width: 52,
            height: 52,
            decoration: const BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              AppIcons.castor,
              color: AppColors.onPrimary,
              size: 24,
            ),
          ),
        ),
      ),
    );
  }
}
