import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import '../../core/app_platform.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_icons.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// The kind of text field, which decides the trailing icon.
enum AppTextFieldType {
  /// Plain field with no trailing icon.
  plain,

  /// "Ask" field with a mic icon at the end.
  ask,

  /// Search field with a search icon at the end.
  search,
}

/// Castor Design System — Text Field (platform-adaptive).
///
/// Returns a [CupertinoTextField] on iOS and a Material [TextField] on Android,
/// with the same Castor look (surface background, light border, rounded).
///
/// The [type] flag decides the trailing icon: a mic for "ask" fields and a
/// magnifier for "search" fields.
class AppTextField extends StatelessWidget {
  const AppTextField({
    super.key,
    this.controller,
    this.hintText,
    this.type = AppTextFieldType.plain,
    this.onChanged,
    this.onSubmitted,
    this.onIconTap,
    this.obscureText = false,
  });

  /// Controls/reads the text (optional).
  final TextEditingController? controller;

  /// Placeholder shown when the field is empty.
  final String? hintText;

  /// Which kind of field this is (decides the trailing icon).
  final AppTextFieldType type;

  /// Called on every keystroke.
  final ValueChanged<String>? onChanged;

  /// Called when the user presses enter/return.
  final ValueChanged<String>? onSubmitted;

  /// Called when the trailing mic/search icon is tapped.
  final VoidCallback? onIconTap;

  /// Hide the text (for passwords).
  final bool obscureText;

  /// Builds the trailing icon based on [type], or null for a plain field.
  Widget? _trailingIcon() {
    IconData? icon;
    switch (type) {
      case AppTextFieldType.ask:
        icon = AppIcons.mic;
      case AppTextFieldType.search:
        icon = AppIcons.search;
      case AppTextFieldType.plain:
        icon = null;
    }
    if (icon == null) return null;

    return GestureDetector(
      onTap: onIconTap,
      child: Padding(
        padding: const EdgeInsets.only(right: AppSpacing.md),
        child: Icon(icon, color: AppColors.textSecondary, size: 20),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Shared look for both platforms.
    final TextStyle textStyle = AppTypography.bodyLarge;
    final TextStyle hintStyle =
        AppTypography.bodyLarge.copyWith(color: AppColors.textTertiary);
    const padding = EdgeInsets.symmetric(
      horizontal: AppSpacing.lg,
      vertical: AppSpacing.md,
    );
    final Widget? trailing = _trailingIcon();

    // iOS: Cupertino text field.
    if (AppPlatform.isIOS) {
      return CupertinoTextField(
        controller: controller,
        placeholder: hintText,
        placeholderStyle: hintStyle,
        style: textStyle,
        onChanged: onChanged,
        onSubmitted: onSubmitted,
        obscureText: obscureText,
        padding: padding,
        suffix: trailing,
        suffixMode: OverlayVisibilityMode.always,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.border),
        ),
      );
    }

    // Android: Material text field.
    final border = OutlineInputBorder(
      borderRadius: BorderRadius.circular(AppRadius.md),
      borderSide: const BorderSide(color: AppColors.border),
    );
    return TextField(
      controller: controller,
      style: textStyle,
      onChanged: onChanged,
      onSubmitted: onSubmitted,
      obscureText: obscureText,
      decoration: InputDecoration(
        hintText: hintText,
        hintStyle: hintStyle,
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: padding,
        suffixIcon: trailing,
        border: border,
        enabledBorder: border,
        focusedBorder: border.copyWith(
          borderSide: const BorderSide(color: AppColors.primary),
        ),
      ),
    );
  }
}
