import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Castor Design System — Tag Chip.
///
/// A small, static chip that labels a category, e.g. "Operations" or "Finance".
/// By default it is neutral (light background with dark text). Pass a [color] to
/// tint it (light background + matching coloured text), e.g. green "People".
class TagChip extends StatelessWidget {
  const TagChip({
    super.key,
    required this.label,
    this.color,
  });

  /// The text shown inside the chip.
  final String label;

  /// Optional accent colour. When set, the chip becomes a light tint of this
  /// colour with matching coloured text.
  final Color? color;

  @override
  Widget build(BuildContext context) {
    // Neutral by default; tinted when a colour is given.
    final Color backgroundColor =
        color != null ? color!.withValues(alpha: 0.12) : AppColors.surfaceMuted;
    final Color textColor = color ?? AppColors.textPrimary;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      // The chip hugs its text (it does not stretch to fill the row).
      child: Text(
        label,
        style: AppTypography.label.copyWith(color: textColor),
      ),
    );
  }
}
