import 'package:flutter/material.dart';

import '../../core/adaptive_tap.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_icons.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Castor Design System — Home App Bar (Overview top).
///
/// Shows the Castor brand on the left and, on the right, a notification bell
/// (with a green dot) and a circular avatar.
///
/// Implements [PreferredSizeWidget] so it can be used as a Scaffold appBar.
class HomeAppBar extends StatelessWidget implements PreferredSizeWidget {
  const HomeAppBar({
    super.key,
    this.onNotification,
    this.onAvatar,
    this.hasNotification = true,
    this.avatarInitials = 'G',
  });

  /// Bell tap.
  final VoidCallback? onNotification;

  /// Avatar tap.
  final VoidCallback? onAvatar;

  /// Shows the green dot on the bell when true.
  final bool hasNotification;

  /// Placeholder initials shown in the avatar.
  final String avatarInitials;

  @override
  Size get preferredSize => const Size.fromHeight(72);

  @override
  Widget build(BuildContext context) {
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
              // Brand logo + name.
              const Icon(AppIcons.castor, color: AppColors.primary, size: 26),
              const SizedBox(width: AppSpacing.sm),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'CASTOR',
                    style: AppTypography.headingMedium
                        .copyWith(fontSize: 16, letterSpacing: 1),
                  ),
                  Text('by HORQUVA OCOS', style: AppTypography.caption),
                ],
              ),
              const Spacer(),
              _bell(),
              const SizedBox(width: AppSpacing.md),
              _avatar(),
            ],
          ),
        ),
      ),
    );
  }

  /// Notification bell in a soft-shadow circle, with a green dot when active.
  Widget _bell() {
    return AdaptiveTap(
      onTap: onNotification,
      borderRadius: BorderRadius.circular(20),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
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
            child: const Icon(
              AppIcons.notification,
              color: AppColors.textPrimary,
              size: 20,
            ),
          ),
          if (hasNotification)
            Positioned(
              right: 2,
              top: 2,
              child: Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: AppColors.success,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.background, width: 1.5),
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// Circular avatar (placeholder shows initials).
  Widget _avatar() {
    return AdaptiveTap(
      onTap: onAvatar,
      borderRadius: BorderRadius.circular(22),
      child: Container(
        width: 42,
        height: 42,
        alignment: Alignment.center,
        decoration: const BoxDecoration(
          color: AppColors.primary,
          shape: BoxShape.circle,
        ),
        child: Text(
          avatarInitials,
          style: AppTypography.label.copyWith(
            color: AppColors.onPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
