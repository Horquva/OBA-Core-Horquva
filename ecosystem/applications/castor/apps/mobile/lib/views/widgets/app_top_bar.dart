import 'package:flutter/material.dart';

import '../../core/adaptive_tap.dart';
import '../../core/app_platform.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_icons.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Castor Design System — App Top Bar (detail style).
///
/// The top bar used on most screens: an optional back button, a [title] with an
/// optional [subtitle], and an optional action icon on the right (e.g. filter
/// or share). The back arrow matches the platform (chevron on iOS, arrow on
/// Android).
///
/// It implements [PreferredSizeWidget] so it can be used as a Scaffold appBar.
class AppTopBar extends StatelessWidget implements PreferredSizeWidget {
  const AppTopBar({
    super.key,
    required this.title,
    this.subtitle,
    this.onBack,
    this.actionIcon,
    this.onAction,
  });

  /// The screen title, e.g. "Signals".
  final String title;

  /// Optional line under the title, e.g. "All critical and important signals".
  final String? subtitle;

  /// Back button tap. When null, no back button is shown.
  final VoidCallback? onBack;

  /// Optional icon on the right (e.g. filter or share).
  final IconData? actionIcon;

  /// Tap for the action icon.
  final VoidCallback? onAction;

  @override
  Size get preferredSize => Size.fromHeight(subtitle != null ? 78 : 60);

  @override
  Widget build(BuildContext context) {
    // Back icon matches the platform: chevron on iOS, arrow on Android.
    final IconData backIcon =
        AppPlatform.isIOS ? AppIcons.backChevron : AppIcons.backArrow;

    return Container(
      color: AppColors.background,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.md,
          ),
          child: Row(
            children: [
              // Back button (only when onBack is given).
              if (onBack != null) ...[
                _circleButton(backIcon, onBack),
                const SizedBox(width: AppSpacing.md),
              ],
              // Title + optional subtitle.
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(title, style: AppTypography.headingLarge),
                    if (subtitle != null) ...[
                      const SizedBox(height: 2),
                      Text(subtitle!, style: AppTypography.bodyMedium),
                    ],
                  ],
                ),
              ),
              // Action icon (only when actionIcon is given).
              if (actionIcon != null) ...[
                const SizedBox(width: AppSpacing.md),
                _circleButton(actionIcon!, onAction),
              ],
            ],
          ),
        ),
      ),
    );
  }

  /// A round icon button used for the back and action icons (matches the UI).
  Widget _circleButton(IconData icon, VoidCallback? onTap) {
    return AdaptiveTap(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: 40,
        height: 40,
        alignment: Alignment.center,
        decoration: const BoxDecoration(
          // Same colour as the background; the soft shadow makes the circle's
          // edge visible and gives it a raised, elegant look.
          color: AppColors.background,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: AppColors.shadow,
              blurRadius: 10,
              offset: Offset(0, 3),
            ),
          ],
        ),
        child: Icon(icon, size: 20, color: AppColors.textPrimary),
      ),
    );
  }
}
