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
    this.avatarImage,
    this.avatarInitials = 'G',
  });

  /// Bell tap.
  final VoidCallback? onNotification;

  /// Avatar tap.
  final VoidCallback? onAvatar;

  /// Shows the green dot on the bell when true.
  final bool hasNotification;

  /// The user's profile picture (DP). When null, a default asset image is
  /// shown instead.
  final ImageProvider? avatarImage;

  /// Last-resort initials, shown only if the default image is also missing.
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
              // Brand logo mark (icon only, no text). Falls back to the star
              // icon if the asset is missing.
              Image.asset(
                'assets/images/castor_mark.png',
                width: 44,
                height: 44,
                errorBuilder: (context, error, stackTrace) => const Icon(
                  AppIcons.castor,
                  color: AppColors.primary,
                  size: 30,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
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

  /// Circular avatar: the user's DP, else a default asset, else initials.
  Widget _avatar() {
    const double size = 42;

    final Widget picture = avatarImage != null
        // The user's profile picture.
        ? Image(image: avatarImage!, width: size, height: size, fit: BoxFit.cover)
        // No DP set — show the default image (falls back to initials).
        : Image.asset(
            'assets/images/default_avatar.png',
            width: size,
            height: size,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) => _initialsFallback(size),
          );

    return AdaptiveTap(
      onTap: onAvatar,
      borderRadius: BorderRadius.circular(size / 2),
      child: ClipOval(
        child: SizedBox(width: size, height: size, child: picture),
      ),
    );
  }

  /// A coloured circle with the user's initials (last-resort avatar).
  Widget _initialsFallback(double size) {
    return Container(
      width: size,
      height: size,
      color: AppColors.primary,
      alignment: Alignment.center,
      child: Text(
        avatarInitials,
        style: AppTypography.label.copyWith(
          color: AppColors.onPrimary,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
