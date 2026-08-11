import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_typography.dart';

class DarkTheme {
  DarkTheme._();

  static ThemeData get theme {
    final colorScheme = ColorScheme.dark(
      primary: AppColors.primaryLight,
      onPrimary: Colors.white,
      primaryContainer: AppColors.primary,
      onPrimaryContainer: Colors.white,
      secondary: AppColors.secondaryLight,
      onSecondary: Colors.white,
      secondaryContainer: AppColors.secondary,
      onSecondaryContainer: Colors.white,
      surface: AppColors.cardDark,
      onSurface: Colors.white,
      surfaceContainer: AppColors.surfaceDark,
      error: AppColors.error,
      onError: Colors.white,
      outline: AppColors.border,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.backgroundDark,
      textTheme: TextTheme(
        displayLarge: AppTypography.displayLarge.copyWith(color: Colors.white),
        displayMedium: AppTypography.displayMedium.copyWith(color: Colors.white),
        displaySmall: AppTypography.displaySmall.copyWith(color: Colors.white),
        headlineLarge: AppTypography.headlineLarge.copyWith(color: Colors.white),
        headlineMedium: AppTypography.headlineMedium.copyWith(color: Colors.white),
        headlineSmall: AppTypography.headlineSmall.copyWith(color: Colors.white),
        titleLarge: AppTypography.titleLarge.copyWith(color: Colors.white),
        titleMedium: AppTypography.titleMedium.copyWith(color: Colors.white),
        titleSmall: AppTypography.titleSmall.copyWith(color: Colors.white),
        bodyLarge: AppTypography.bodyLarge.copyWith(color: Colors.white70),
        bodyMedium: AppTypography.bodyMedium.copyWith(color: Colors.white60),
        bodySmall: AppTypography.bodySmall.copyWith(color: Colors.white54),
        labelLarge: AppTypography.labelLarge.copyWith(color: Colors.white),
        labelMedium: AppTypography.labelMedium.copyWith(color: Colors.white60),
        labelSmall: AppTypography.labelSmall.copyWith(color: Colors.white38),
      ),
      appBarTheme: AppBarTheme(
        elevation: 0,
        centerTitle: false,
        backgroundColor: AppColors.cardDark,
        foregroundColor: Colors.white,
        titleTextStyle: AppTypography.titleLarge.copyWith(color: Colors.white),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        color: AppColors.cardDark,
        surfaceTintColor: Colors.transparent,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          elevation: 0,
          backgroundColor: AppColors.primaryLight,
          foregroundColor: Colors.white,
          textStyle: AppTypography.button,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primaryLight,
          textStyle: AppTypography.button,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          side: const BorderSide(color: AppColors.primaryLight),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primaryLight,
          textStyle: AppTypography.button,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceDark,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primaryLight, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error, width: 2),
        ),
        labelStyle: AppTypography.bodyMedium.copyWith(color: Colors.white60),
        hintStyle: AppTypography.bodyMedium.copyWith(color: Colors.white38),
        errorStyle: AppTypography.bodySmall.copyWith(color: AppColors.error),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.cardDark,
        selectedItemColor: AppColors.primaryLight,
        unselectedItemColor: Colors.white38,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: AppTypography.labelSmall,
        unselectedLabelStyle: AppTypography.labelSmall,
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.divider,
        thickness: 1,
        space: 1,
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: AppColors.primaryLight,
        foregroundColor: Colors.white,
        elevation: 4,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }
}
