/// Castor Design System — Border Radius Tokens.
///
/// Standard corner-radius values for cards, buttons, inputs and pills. Using
/// these instead of hard-coded numbers keeps every rounded corner consistent.
abstract final class AppRadius {
  AppRadius._();

  /// 8 — small rounding, e.g. chips and small badges.
  static const double sm = 8;

  /// 12 — inputs and small buttons.
  static const double md = 12;

  /// 16 — the default card corner radius in the mockups.
  static const double lg = 16;

  /// 20 — large cards and bottom sheets.
  static const double xl = 20;

  /// 999 — a fully rounded "pill" shape (used for pill buttons and status tags).
  static const double pill = 999;
}
