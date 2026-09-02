import 'package:flutter/material.dart';
import 'sentinel_colors.dart';

/// Sentinel Design System — ThemeData
/// Owner: Muhammad Anas (Experience Layer)
///
/// Usage in main.dart:
///   MaterialApp.router(theme: sentinelTheme(), ...)
ThemeData sentinelTheme() {
  return ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: SentinelColors.background,
    colorScheme: const ColorScheme.dark(
      primary: SentinelColors.primary,
      secondary: SentinelColors.secondary,
      surface: SentinelColors.surface,
      error: SentinelColors.blocked,
      onPrimary: Colors.white,
      onSurface: SentinelColors.textPrimary,
      onError: Colors.white,
    ),
    cardColor: SentinelColors.surface,
    dividerColor: SentinelColors.border,
    // AppBar
    appBarTheme: const AppBarTheme(
      backgroundColor: SentinelColors.surface,
      elevation: 0,
      scrolledUnderElevation: 0,
      iconTheme: IconThemeData(color: SentinelColors.textPrimary),
      titleTextStyle: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w500,
        color: SentinelColors.textPrimary,
      ),
    ),
    // Bottom NavigationBar
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: SentinelColors.surface,
      indicatorColor: SentinelColors.primary.withValues(alpha: 0.15),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const IconThemeData(color: SentinelColors.primary);
        }
        return const IconThemeData(color: SentinelColors.textSecondary);
      }),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: SentinelColors.primary,
          );
        }
        return const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w400,
          color: SentinelColors.textSecondary,
        );
      }),
    ),
    // Divider
    dividerTheme: const DividerThemeData(
      color: SentinelColors.border,
      thickness: 1,
      space: 0,
    ),
  );
}
