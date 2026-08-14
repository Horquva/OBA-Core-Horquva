import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import 'severity_badge.dart';

/// Castor Design System — Decision Card.
///
/// A card for one decision that needs attention. It shows a leading [icon] on
/// the left, a coloured priority badge and a number on top, then the [title],
/// a [meta] line (impact / action), and the [due] date.
///
/// The priority colour reuses the same [Severity] system as signals, with a
/// custom [priorityLabel] such as "URGENT" or "HIGH PRIORITY".
class DecisionCard extends StatelessWidget {
  const DecisionCard({
    super.key,
    required this.icon,
    required this.severity,
    required this.priorityLabel,
    required this.number,
    required this.title,
    required this.meta,
    required this.due,
    this.onTap,
  });

  /// The leading icon shown on the left of the card.
  final IconData icon;

  /// Drives the badge/icon colour (critical = red, important = amber, etc.).
  final Severity severity;

  /// The text shown in the badge, e.g. "URGENT" or "HIGH PRIORITY".
  final String priorityLabel;

  /// The position number shown in the circle on the right (1, 2, 3 …).
  final int number;

  /// The decision headline.
  final String title;

  /// A short line about impact / action, e.g. "High impact • Requires review".
  final String meta;

  /// The deadline text, e.g. "Due: Today, 02:00 PM".
  final String due;

  /// Optional tap callback (e.g. open the decision detail). Null = not tappable.
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    // White card shape with rounded corners and a light border.
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppRadius.lg),
      side: const BorderSide(color: AppColors.border),
    );

    // The colour used for the icon and its tinted background.
    final Color color = severityColor(severity);

    return Material(
      color: AppColors.surface,
      shape: shape,
      child: InkWell(
        onTap: onTap,
        customBorder: shape,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Leading icon in a small tinted box.
              Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Icon(icon, size: 20, color: color),
              ),
              const SizedBox(width: AppSpacing.md),
              // The main content column takes the remaining width.
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Top row: priority badge on the left, number on the right.
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        SeverityBadge(severity: severity, label: priorityLabel),
                        // A small circle showing the decision's number.
                        Container(
                          width: 24,
                          height: 24,
                          alignment: Alignment.center,
                          decoration: const BoxDecoration(
                            color: AppColors.surfaceMuted,
                            shape: BoxShape.circle,
                          ),
                          child: Text(
                            '$number',
                            style: AppTypography.label
                                .copyWith(color: AppColors.textPrimary),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    // Title.
                    Text(title, style: AppTypography.headingMedium),
                    const SizedBox(height: AppSpacing.sm),
                    // Meta line (impact / action).
                    Text(meta, style: AppTypography.bodyMedium),
                    const SizedBox(height: AppSpacing.sm),
                    // Due date.
                    Text(due, style: AppTypography.label),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
