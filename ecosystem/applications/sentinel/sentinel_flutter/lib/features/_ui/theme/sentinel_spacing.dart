/// Sentinel Design System — Spacing & Breakpoints (Phase 1 Sync from Stitch)
/// Owner: Muhammad Anas (Experience Layer)
abstract class SentinelSpacing {
  // ── Base Grid (4px) ──────────────────────────────────────────────────────
  static const double xs          = 4.0;
  static const double sm          = 8.0;
  static const double md          = 16.0;
  static const double lg          = 24.0;
  static const double xl          = 32.0;
  static const double xxl         = 48.0;

  // ── Semantic Layout ───────────────────────────────────────────────────────
  static const double cardPadding  = 24.0; // from Stitch container-padding
  static const double screenMargin = 24.0;
  static const double sectionGap   = 32.0; // from Stitch stack-lg
  static const double itemGap      = 16.0; // from Stitch gutter
}

abstract class SentinelBreakpoints {
  static const double mobile  = 0.0;
  static const double tablet  = 600.0;
  static const double desktop = 1024.0;
}
