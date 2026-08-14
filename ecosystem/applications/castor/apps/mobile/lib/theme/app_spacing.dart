/// Castor Design System — Spacing Tokens.
///
/// All gaps, paddings and margins in the app should use these values instead of
/// random numbers. This keeps the spacing rhythm consistent everywhere.
///
/// The scale is based on multiples of 4 (a common design-system choice), so the
/// layout always lines up on the same grid.
abstract final class AppSpacing {
  AppSpacing._();

  /// 4 — tiny gap, e.g. between an icon and its label.
  static const double xs = 4;

  /// 8 — small gap.
  static const double sm = 8;

  /// 12 — medium-small gap.
  static const double md = 12;

  /// 16 — the default padding inside cards and screen edges.
  static const double lg = 16;

  /// 24 — space between separate cards/sections.
  static const double xl = 24;

  /// 32 — large section spacing.
  static const double xxl = 32;

  /// 48 — extra-large spacing, e.g. around empty states.
  static const double xxxl = 48;
}
