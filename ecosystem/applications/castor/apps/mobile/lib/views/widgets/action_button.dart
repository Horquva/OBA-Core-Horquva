import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Castor Design System — Action Button (Type 2).
///
/// A larger, richer button that shows a round leading icon plus a title and an
/// optional subtitle. Use this for prominent actions like "Start Briefing".
///
/// Colours normally use the surface/text tokens, but you can override them with
/// [backgroundColor] and [textColor] (for example to place it on a dark card).
///
/// If [onPressed] is null the button is shown as disabled.
class ActionButton extends StatelessWidget {
  const ActionButton({
    super.key,
    required this.icon,
    required this.title,
    required this.onPressed,
    this.subtitle,
    this.backgroundColor,
    this.textColor,
  });

  /// The icon shown inside the round circle on the left (e.g. a play icon).
  final IconData icon;

  /// The main bold text, e.g. "Start Briefing".
  final String title;

  /// Optional supporting text under the title, e.g. "8 min estimated".
  final String? subtitle;

  /// Called when tapped. Pass null to disable the button.
  final VoidCallback? onPressed;

  /// Optional override for the button's background colour (default: surface).
  final Color? backgroundColor;

  /// Optional override for the title/icon colour (default: primary text).
  final Color? textColor;

  @override
  Widget build(BuildContext context) {
    final bool isDisabled = onPressed == null;

    // Pick colours: disabled first, then overrides, then defaults.
    final Color bg = isDisabled
        ? AppColors.surfaceMuted
        : (backgroundColor ?? AppColors.surface);
    final Color fg = isDisabled
        ? AppColors.textTertiary
        : (textColor ?? AppColors.textPrimary);

    // Rounded rectangle shape (not a full pill like PillButton).
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppRadius.lg),
    );

    return Material(
      color: bg,
      shape: shape,
      child: InkWell(
        onTap: onPressed,
        customBorder: shape,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Round circle holding the leading icon.
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: fg.withValues(alpha: 0.4)),
                ),
                child: Icon(icon, size: 20, color: fg),
              ),
              const SizedBox(width: AppSpacing.md),
              // Title and optional subtitle stacked vertically.
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTypography.button.copyWith(color: fg),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      subtitle!,
                      style: AppTypography.caption.copyWith(
                        color: fg.withValues(alpha: 0.7),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
