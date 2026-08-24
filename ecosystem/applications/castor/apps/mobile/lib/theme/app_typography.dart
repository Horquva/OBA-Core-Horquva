import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';

/// Castor Design System — Typography Tokens.
///
/// One place that defines every text style in the app. Widgets should use these
/// styles instead of writing their own TextStyle, so all text stays consistent.
///
/// The design uses two font families:
///  - Fraunces (a serif) for big display text and headings.
///  - Inter (a sans-serif) for body text, labels and buttons.
abstract final class AppTypography {
  AppTypography._();

  // ─── Display: the large greeting text, e.g. "Good morning, Guido." ───────
  static TextStyle get displayLarge => GoogleFonts.fraunces(
        fontSize: 25,
        fontWeight: FontWeight.w700,
        height: 1.15, // line height as a multiple of font size
        color: AppColors.textPrimary,
      );

  static TextStyle get displayMedium => GoogleFonts.fraunces(
        fontSize: 26,
        fontWeight: FontWeight.w600,
        height: 1.2,
        color: AppColors.textPrimary,
      );

  // ─── Headings: screen titles and card titles ─────────────────────────────
  /// Screen titles like "Signals" or "Decisions".
  static TextStyle get headingLarge => GoogleFonts.fraunces(
        fontSize: 22,
        fontWeight: FontWeight.w600,
        height: 1.25,
        color: AppColors.textPrimary,
      );

  /// Card titles, e.g. the critical alert headline.
  static TextStyle get headingMedium => GoogleFonts.fraunces(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        height: 1.3,
        color: AppColors.textPrimary,
      );

  // ─── Titles: small section labels like "Key Takeaways" ───────────────────
  static TextStyle get titleMedium => GoogleFonts.inter(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        height: 1.3,
        color: AppColors.textPrimary,
      );

  // ─── Body: normal paragraph and description text ─────────────────────────
  static TextStyle get bodyLarge => GoogleFonts.inter(
        fontSize: 15,
        fontWeight: FontWeight.w400,
        height: 1.5,
        color: AppColors.textPrimary,
      );

  static TextStyle get bodyMedium => GoogleFonts.inter(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        height: 1.5,
        color: AppColors.textSecondary,
      );

  // ─── Small text: labels and captions ─────────────────────────────────────
  /// Supporting labels, e.g. "Signals analyzed".
  static TextStyle get label => GoogleFonts.inter(
        fontSize: 13,
        fontWeight: FontWeight.w500,
        height: 1.4,
        color: AppColors.textSecondary,
      );

  /// The smallest text: timestamps, footnotes.
  static TextStyle get caption => GoogleFonts.inter(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        height: 1.4,
        color: AppColors.textTertiary,
      );

  // ─── Overline: tiny uppercase text used inside badges (e.g. "CRITICAL") ──
  static TextStyle get overline => GoogleFonts.inter(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        height: 1.2,
        letterSpacing: 0.8, // spreads letters out for the badge look
        color: AppColors.textSecondary,
      );

  // ─── Button: the text shown inside buttons ───────────────────────────────
  static TextStyle get button => GoogleFonts.inter(
        fontSize: 15,
        fontWeight: FontWeight.w600,
        height: 1.2,
        color: AppColors.onPrimary,
      );
}
