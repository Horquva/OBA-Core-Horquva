import 'package:flutter/material.dart';

/// Sentinel Design System — Color Tokens (Phase 1 Sync from Stitch)
/// Owner: Muhammad Anas (Experience Layer)
abstract class SentinelColors {
  // ── Backgrounds ─────────────────────────────────────────────────────────
  static const Color background          = Color(0xFF10131A); 
  static const Color surface             = Color(0xFF191B23); 
  static const Color surfaceHigh         = Color(0xFF32353C); 

  // ── Security State Colors ────────────────────────────────────────────────
  static const Color healthy             = Color(0xFF10B981); 
  static const Color warning             = Color(0xFFF59E0B); 
  static const Color blocked             = Color(0xFFFFB4AB); // Error color from Stitch
  static const Color degraded            = Color(0xFFF97316); 
  static const Color unavailable         = Color(0xFF424754); // Outline variant
  static const Color unknown             = Color(0xFF32353C); 

  // ── Brand / Interactive ──────────────────────────────────────────────────
  static const Color primary             = Color(0xFFADC6FF); // Stitch primary
  static const Color primaryGlow         = Color(0xFF00D9FF); // Stitch secondary dim (Cyan glow)
  static const Color secondary           = Color(0xFFAEECFF); // Stitch secondary

  // ── Text ─────────────────────────────────────────────────────────────────
  static const Color textPrimary         = Color(0xFFE1E2EC); // on-surface
  static const Color textSecondary       = Color(0xFFC2C6D6); // on-surface-variant
  static const Color textMuted           = Color(0xFF8C909F); // outline

  // ── Borders ──────────────────────────────────────────────────────────────
  static const Color border              = Color(0xFF424754); // outline-variant
  static const Color borderActive        = Color(0xFFADC6FF); // primary
}
