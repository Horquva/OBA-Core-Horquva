import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
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
/// A small, colour-coded chip that shows how urgent something is, e.g.
/// "CRITICAL" or "IMPORTANT". The colours come from the severity level so the
/// meaning stays consistent everywhere.
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
    // Choose the text colour, background colour and default label for the level.
    final Color textColor;
    final Color backgroundColor;
    final String defaultLabel;

    switch (severity) {
      case Severity.critical:
        textColor = AppColors.critical;
        backgroundColor = AppColors.criticalSurface;
        defaultLabel = 'CRITICAL';
      case Severity.important:
        textColor = AppColors.important;
        backgroundColor = AppColors.importantSurface;
        defaultLabel = 'IMPORTANT';
      case Severity.informational:
        textColor = AppColors.informational;
        backgroundColor = AppColors.informationalSurface;
        defaultLabel = 'INFORMATIONAL';
    }

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      // The badge hugs its text (it does not stretch to fill the row).
      child: Text(
        label ?? defaultLabel,
        style: AppTypography.overline.copyWith(color: textColor),
      ),
    );
  }
}
