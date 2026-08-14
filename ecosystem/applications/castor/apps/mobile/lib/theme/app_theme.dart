import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'app_typography.dart';

/// Castor Design System — App Theme.
///
/// This ties all the tokens (colors + typography) into a single ThemeData that
/// MaterialApp uses. Because of this, default Flutter widgets (Scaffold, AppBar,
/// Text, etc.) already look "on brand" without extra styling on every screen.
abstract final class AppTheme {
  AppTheme._();

  /// The app uses a single light theme (the mockups are light).
  static ThemeData get light {
    // Start from a colour scheme seeded by our primary green, then override the
    // specific roles we care about with exact tokens.
    final ColorScheme colorScheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: Brightness.light,
    ).copyWith(
      primary: AppColors.primary,
      onPrimary: AppColors.onPrimary,
      secondary: AppColors.accent,
      onSecondary: AppColors.onAccent,
      surface: AppColors.surface,
      onSurface: AppColors.textPrimary,
      error: AppColors.critical,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,

      // The cream canvas behind every screen.
      scaffoldBackgroundColor: AppColors.background,

      // Map our text styles onto Flutter's built-in text theme slots, so a plain
      // Text() widget picks up the right style automatically.
      textTheme: TextTheme(
        displayLarge: AppTypography.displayLarge,
        displayMedium: AppTypography.displayMedium,
        headlineMedium: AppTypography.headingLarge,
        headlineSmall: AppTypography.headingMedium,
        titleMedium: AppTypography.titleMedium,
        bodyLarge: AppTypography.bodyLarge,
        bodyMedium: AppTypography.bodyMedium,
        labelLarge: AppTypography.button,
        bodySmall: AppTypography.caption,
        labelSmall: AppTypography.overline,
      ),

      // Default look for the top app bar.
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        centerTitle: false,
      ),

      // Default hairline colour for Divider().
      dividerColor: AppColors.border,
    );
  }
}
