import 'package:flutter/material.dart';

/// Castor Design System — Color Tokens.
///
/// Single source of truth for every colour in the app. Widgets must read from
/// here (or from `Theme.of(context)`), never hard-code hex values — that is how
/// the whole UI stays consistent and re-themeable from one file.
///
/// Palette is derived from the approved Castor mobile mockups:
/// warm cream canvas, deep forest-green primary, muted gold accent, and a
/// desaturated severity ramp (critical / important / informational).
abstract final class AppColors {
  AppColors._();

  // ─── Surfaces ──────────────────────────────────────────────────────────
  /// App canvas — the warm off-white behind everything.
  static const Color background = Color(0xFFF5F2EC);

  /// Cards, sheets, elevated containers sitting on the canvas.
  static const Color surface = Color(0xFFFCFBF8);

  /// Secondary surface — side rail, subtle grouped areas.
  static const Color surfaceMuted = Color(0xFFEFEBE2);

  /// Pressed / hovered surface state.
  static const Color surfaceHover = Color(0xFFE8E3D8);

  // ─── Brand ─────────────────────────────────────────────────────────────
  /// Primary forest green — buttons, active nav, briefing card, brand.
  static const Color primary = Color(0xFF1E3D32);

  /// Darker green for pressed states / deep surfaces.
  static const Color primaryDark = Color(0xFF162E26);

  /// Content that sits on top of [primary] (text/icons on green).
  static const Color onPrimary = Color(0xFFF5F2EC);

  /// Muted gold — critical markers, numbered badges, premium accents.
  static const Color accent = Color(0xFFC0A24E);

  /// Content on top of [accent].
  static const Color onAccent = Color(0xFF241E0A);

  // ─── Text ──────────────────────────────────────────────────────────────
  /// Primary text — near-black with a warm green undertone.
  static const Color textPrimary = Color(0xFF1C221E);

  /// Secondary / supporting text, labels, captions.
  static const Color textSecondary = Color(0xFF6B7169);

  /// Disabled / very dim text and placeholders.
  static const Color textTertiary = Color(0xFF9AA097);

  // ─── Borders & dividers ────────────────────────────────────────────────
  /// Default hairline border on cards and inputs.
  static const Color border = Color(0xFFE3DED3);

  /// Slightly stronger border for emphasis / focus outlines.
  static const Color borderStrong = Color(0xFFCFC8B8);

  // ─── Severity ramp (status of signals, risks, decisions) ───────────────
  /// Critical — highest urgency (red).
  static const Color critical = Color(0xFFC0392B);
  static const Color criticalSurface = Color(0xFFF7E7E4);

  /// Important / high priority (amber).
  static const Color important = Color(0xFFC98A1B);
  static const Color importantSurface = Color(0xFFF7EEDB);

  /// Informational / low priority (green).
  static const Color informational = Color(0xFF2E7D52);
  static const Color informationalSurface = Color(0xFFE4F0E8);

  // ─── System status ─────────────────────────────────────────────────────
  /// "All Systems Operational" dot, healthy meters.
  static const Color success = Color(0xFF2E7D52);

  /// Neutral shadow colour for elevation (used with low opacity).
  static const Color shadow = Color(0x141C221E);
}
