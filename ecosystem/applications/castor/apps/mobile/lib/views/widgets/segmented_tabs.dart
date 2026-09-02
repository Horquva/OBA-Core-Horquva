import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// One tab in [SegmentedTabs]: a label and an optional count.
class SegmentTab {
  const SegmentTab(this.label, {this.count});

  /// The tab text, e.g. "Critical".
  final String label;

  /// Optional number shown in brackets, e.g. 2 → "Critical (2)".
  final int? count;
}

/// Castor Design System — Segmented Tabs.
///
/// A horizontal row of text tabs used to filter a list, e.g.
/// "All Signals · Critical (2) · Important (5)". The active tab has dark bold
/// text with a short rounded bar under it; all tabs share a light grey baseline.
/// The row scrolls sideways if the tabs do not all fit.
class SegmentedTabs extends StatelessWidget {
  const SegmentedTabs({
    super.key,
    required this.tabs,
    required this.currentIndex,
    required this.onTap,
  });

  /// The tabs to show.
  final List<SegmentTab> tabs;

  /// Index of the active tab.
  final int currentIndex;

  /// Called when a tab is tapped, with its index.
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      // A light grey baseline line under all the tabs (not black).
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          // Align tabs to the bottom so their bars sit on the baseline.
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            for (int i = 0; i < tabs.length; i++) _tab(tabs[i], i),
          ],
        ),
      ),
    );
  }

  /// One tab: dark bold text + a rounded bar when active; grey text when not.
  Widget _tab(SegmentTab tab, int index) {
    final bool active = index == currentIndex;
    final Color textColor =
        active ? AppColors.textPrimary : AppColors.textSecondary;

    // Show the count in brackets when present.
    final String text =
        tab.count != null ? '${tab.label} (${tab.count})' : tab.label;

    return GestureDetector(
      onTap: () => onTap(index),
      behavior: HitTestBehavior.opaque,
      child: Container(
        margin: const EdgeInsets.only(right: AppSpacing.lg),
        // IntrinsicWidth bounds the column to the text width, so the bar can
        // stretch to match it (needed because the row scrolls horizontally).
        child: IntrinsicWidth(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            // Stretch makes the bar match the text width.
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // The active tab also gets a subtle rounded pill behind the text.
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.lg,
                  vertical: AppSpacing.sm,
                ),
                decoration: BoxDecoration(
                  color: active ? AppColors.surfaceMuted : Colors.transparent,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Text(
                  text,
                  textAlign: TextAlign.center,
                  style: AppTypography.bodyMedium.copyWith(
                    color: textColor,
                    fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),
              ),
              // A small gap so the bar sits just below the pill, not attached.
              const SizedBox(height: AppSpacing.xs),
              // The short rounded bar under the active pill.
              Container(
                height: 3,
                decoration: BoxDecoration(
                  color: active ? AppColors.textPrimary : Colors.transparent,
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
