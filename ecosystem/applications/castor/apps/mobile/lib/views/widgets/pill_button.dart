import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// The two looks a pill button can have.
enum PillButtonVariant {
  /// Solid forest-green pill (main action). E.g. "Review & Take Action".
  primary,

  /// Light pill with a border (secondary action). E.g. "Summary".
  secondary,
}

/// Castor Design System — Pill Button (Type 1).
///
/// A simple, fully-rounded button that shows a single line of text with an
/// optional trailing icon. Use this for most tap actions.
///
/// Colours normally come from [variant], but you can override them with
/// [backgroundColor] and [textColor] when a screen needs custom colours.
///
/// If [onPressed] is null the button is automatically shown as disabled.
class PillButton extends StatelessWidget {
  const PillButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = PillButtonVariant.primary,
    this.icon,
    this.fullWidth = false,
    this.backgroundColor,
    this.textColor,
  });

  /// The text shown inside the button.
  final String label;

  /// Called when tapped. Pass null to disable the button.
  final VoidCallback? onPressed;

  /// Which look to use (primary or secondary).
  final PillButtonVariant variant;

  /// Optional icon shown after the label (e.g. a forward arrow).
  final IconData? icon;

  /// If true, the button stretches to fill the available width.
  final bool fullWidth;

  /// Optional override for the pill's background colour.
  /// When null, the colour comes from [variant].
  final Color? backgroundColor;

  /// Optional override for the text (and icon) colour.
  /// When null, the colour comes from [variant].
  final Color? textColor;

  @override
  Widget build(BuildContext context) {
    // A button with no onPressed is treated as disabled.
    final bool isDisabled = onPressed == null;

    // Step 1: start with the default colours for the current state/variant.
    Color bg;
    Color fg;
    BorderSide border;

    if (isDisabled) {
      bg = AppColors.surfaceMuted;
      fg = AppColors.textTertiary;
      border = BorderSide.none;
    } else if (variant == PillButtonVariant.primary) {
      bg = AppColors.primary;
      fg = AppColors.onPrimary;
      border = BorderSide.none;
    } else {
      // secondary
      bg = AppColors.surface;
      fg = AppColors.primary;
      border = const BorderSide(color: AppColors.border);
    }

    // Step 2: apply constructor colour overrides (ignored while disabled).
    if (!isDisabled && backgroundColor != null) bg = backgroundColor!;
    if (!isDisabled && textColor != null) fg = textColor!;

    // Rounded-rectangle shape with a moderate corner radius (not a full pill).
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppRadius.md),
      side: border,
    );

    return SizedBox(
      // Full width when asked; otherwise the button hugs its content.
      width: fullWidth ? double.infinity : null,
      child: Material(
        color: bg,
        shape: shape,
        child: InkWell(
          onTap: onPressed,
          // Clip the tap ripple to the pill shape.
          customBorder: shape,
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xl,
              vertical: AppSpacing.lg,
            ),
            child: Row(
              mainAxisSize: fullWidth ? MainAxisSize.max : MainAxisSize.min,
              // Full width + icon: text on the left, icon pushed to the far end.
              // Otherwise keep the label (and icon) centered together.
              mainAxisAlignment: (fullWidth && icon != null)
                  ? MainAxisAlignment.spaceBetween
                  : MainAxisAlignment.center,
              children: [
                Text(
                  label,
                  style: AppTypography.button.copyWith(color: fg),
                ),
                if (icon != null) ...[
                  // Gap only when centered (space-between already spaces).
                  if (!fullWidth) const SizedBox(width: AppSpacing.md),
                  Icon(icon, size: 18, color: fg),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
