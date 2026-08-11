import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Castor Design System — Stat Item.
///
/// Shows a single statistic: a big [value] (e.g. "12,481") with a small [label]
/// underneath (e.g. "Signals analyzed") and an optional [icon]. Used in the
/// Overview header where several stats sit side by side.
class StatItem extends StatelessWidget {
  const StatItem({
    super.key,
    required this.value,
    required this.label,
    this.icon,
    this.valueColor,
  });

  /// The big number or text, e.g. "12,481".
  final String value;

  /// The small description under the value, e.g. "Signals analyzed".
  final String label;

  /// Optional small icon shown before the value.
  final IconData? icon;

  /// Optional colour for the value text. When null, the default text colour
  /// from the typography style is used.
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    // Size of the icon, also used to indent the label so it lines up with the
    // value instead of the icon.
    const double iconSize = 16;
    final double labelIndent = icon != null ? iconSize + AppSpacing.xs : 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Line 1: icon and value, vertically centred so they sit level.
        Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            if (icon != null) ...[
              Icon(icon, size: iconSize, color: AppColors.textSecondary),
              const SizedBox(width: AppSpacing.xs),
            ],
            // copyWith(color: null) keeps the style's default colour, so a null
            // valueColor simply falls back to the default.
            Text(
              value,
              style: AppTypography.headingLarge.copyWith(color: valueColor),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.xs),
        // Line 2: label, indented so it starts under the value (not the icon).
        Padding(
          padding: EdgeInsets.only(left: labelIndent),
          child: Text(label, style: AppTypography.label),
        ),
      ],
    );
  }
}
