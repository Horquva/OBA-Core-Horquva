import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';

/// How urgent a signal / decision is. Each level has its own colour.
enum Severity {
  /// Highest urgency (red).
  critical,

  /// Medium urgency (amber).
  important,

  /// Low urgency / just info (green).
  informational,
}

/// Returns the main colour for a severity level.
///
/// Kept as a small shared helper so the badge, cards and tags all use the same
/// colour for the same severity.
Color severityColor(Severity severity) {
  switch (severity) {
    case Severity.critical:
      return AppColors.critical;
    case Severity.important:
      return AppColors.important;
    case Severity.informational:
      return AppColors.informational;
  }
}

/// Castor Design System — Severity Badge.
///
/// Shows how urgent something is as small, coloured, uppercase text, e.g.
/// "CRITICAL". There is no background — just the coloured label (matches the
/// mockups). The colour comes from the severity level so meaning stays
/// consistent everywhere.
///
/// Pass a custom [label] if you need different text (e.g. "URGENT") while
/// keeping the colour of a severity level.
class SeverityBadge extends StatelessWidget {
  const SeverityBadge({
    super.key,
    required this.severity,
    this.label,
  });

  /// Which urgency level this badge represents.
  final Severity severity;

  /// Optional custom text. When null, the level's default name is used.
  final String? label;

  @override
  Widget build(BuildContext context) {
    // The default text for each level (used when no custom label is given).
    final String defaultLabel;
    switch (severity) {
      case Severity.critical:
        defaultLabel = 'CRITICAL';
      case Severity.important:
        defaultLabel = 'IMPORTANT';
      case Severity.informational:
        defaultLabel = 'INFORMATIONAL';
    }

    // Just coloured uppercase text — no background box.
    return Text(
      label ?? defaultLabel,
      style: AppTypography.overline.copyWith(color: severityColor(severity)),
    );
  }
}
