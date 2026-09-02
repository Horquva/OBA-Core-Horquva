import 'package:flutter/material.dart';
import 'sentinel_colors.dart';

/// Sentinel Design System — Typography (Phase 1 Sync from Stitch)
/// Owner: Muhammad Anas (Experience Layer)
abstract class SentinelTextStyles {
  // ── Display ───────────────────────────────────────────────────────────────
  static const TextStyle displayHero = TextStyle(
    fontSize: 36, // display-metrics
    fontWeight: FontWeight.w700, // Inter
    color: SentinelColors.textPrimary,
    letterSpacing: -0.72, // -0.02em at 36px
    height: 1.22, // 44px / 36px
  );

  // ── Headlines ─────────────────────────────────────────────────────────────
  static const TextStyle headlineLg = TextStyle(
    fontSize: 32, // headline-h1
    fontWeight: FontWeight.w600, // Space Grotesk
    color: SentinelColors.textPrimary,
    letterSpacing: -0.32, // -0.01em
    height: 1.25, // 40px / 32px
  );

  static const TextStyle headlineMd = TextStyle(
    fontSize: 24, // headline-h2
    fontWeight: FontWeight.w500, // Space Grotesk
    color: SentinelColors.textPrimary,
    height: 1.33, // 32px / 24px
  );

  static const TextStyle headlineSm = TextStyle(
    fontSize: 20, 
    fontWeight: FontWeight.w600,
    color: SentinelColors.textPrimary,
    height: 1.4,
  );

  // ── Body ──────────────────────────────────────────────────────────────────
  static const TextStyle bodyLg = TextStyle(
    fontSize: 18, // body-lg
    fontWeight: FontWeight.w400, // Inter
    color: SentinelColors.textPrimary,
    height: 1.55, // 28px / 18px
  );

  static const TextStyle bodyMd = TextStyle(
    fontSize: 16, // body-md
    fontWeight: FontWeight.w400, // Inter
    color: SentinelColors.textSecondary,
    height: 1.5, // 24px / 16px
  );

  static const TextStyle bodySm = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: SentinelColors.textSecondary,
    height: 1.4,
  );

  // ── Labels ────────────────────────────────────────────────────────────────
  static const TextStyle labelCaps = TextStyle(
    fontSize: 12, // label-caps
    fontWeight: FontWeight.w600, // Inter
    color: SentinelColors.textSecondary,
    letterSpacing: 0.6, // 0.05em
    height: 1.33, // 16px / 12px
  );
  
  static const TextStyle labelSm = TextStyle(
    fontSize: 11, // label-sm
    fontWeight: FontWeight.w500, // Inter
    color: SentinelColors.textSecondary,
    height: 1.27, // 14px / 11px
  );

  // ── Metrics / Data ────────────────────────────────────────────────────────
  static const TextStyle metricValue = TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    color: SentinelColors.textPrimary,
    letterSpacing: -0.56,
    height: 1.1,
  );
}
