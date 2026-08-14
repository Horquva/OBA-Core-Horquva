import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Castor Design System — Status Pill.
///
/// A small rounded pill showing a status, e.g. "All Systems Operational" or
/// "Last updated: 08:42 AM". On the left it shows either a coloured dot (default)
/// or an [icon]. It can also show an optional dropdown chevron on the right.
class StatusPill extends StatelessWidget {
  const StatusPill({
    super.key,
    required this.label,
    this.icon,
    this.dotColor = AppColors.success,
    this.showChevron = false,
    this.onTap,
  });

  /// The status text, e.g. "All Systems Operational".
  final String label;

  /// Optional leading icon. When set, it replaces the coloured dot.
  final IconData? icon;

  /// Colour of the dot on the left (used only when [icon] is null).
  final Color dotColor;

  /// Whether to show a dropdown arrow on the right.
  final bool showChevron;

  /// Optional tap callback (e.g. to open a menu or refresh). Null = not tappable.
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    // Same rounded-rectangle radius as PillButton, with a light border.
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppRadius.md),
      side: const BorderSide(color: AppColors.border),
    );

    // The leading element: an icon if given, otherwise the coloured dot.
    final Widget leading = icon != null
        ? Icon(icon, size: 16, color: AppColors.textSecondary)
        : Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: dotColor,
              shape: BoxShape.circle,
            ),
          );

    return Material(
      color: AppColors.surface,
      shape: shape,
      child: InkWell(
        onTap: onTap,
        customBorder: shape,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.md,
          ),
          child: Row(
            // Hug the content instead of filling the row.
            mainAxisSize: MainAxisSize.min,
            children: [
              leading,
              const SizedBox(width: AppSpacing.sm),
              Text(
                label,
                style:
                    AppTypography.label.copyWith(color: AppColors.textPrimary),
              ),
              if (showChevron) ...[
                const SizedBox(width: AppSpacing.xs),
                const Icon(
                  Icons.keyboard_arrow_down,
                  size: 18,
                  color: AppColors.textSecondary,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
