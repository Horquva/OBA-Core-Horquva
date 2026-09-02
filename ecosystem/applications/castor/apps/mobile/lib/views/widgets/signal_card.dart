import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import 'severity_badge.dart';
import 'tag_chip.dart';

/// Castor Design System — Signal Card.
///
/// A card that shows one "signal": a leading [icon] on the left, then its
/// urgency ([severity]) and [time] on top, a [title], a short [description],
/// and a row of category [tags]. Tapping can open the signal's detail screen.
class SignalCard extends StatelessWidget {
  const SignalCard({
    super.key,
    required this.icon,
    required this.severity,
    required this.time,
    required this.title,
    required this.description,
    this.tags = const [],
    this.onTap,
  });

  /// The leading icon shown on the left of the card.
  final IconData icon;

  /// How urgent the signal is (drives the coloured badge and icon).
  final Severity severity;

  /// When the signal happened, e.g. "08:12 AM".
  final String time;

  /// The signal headline.
  final String title;

  /// A short explanation of the signal.
  final String description;

  /// Category tags shown at the bottom, e.g. ["Operations", "Risk"].
  final List<String> tags;

  /// Optional tap callback (e.g. open the signal detail). Null = not tappable.
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
            // Icon aligns with the top of the content.
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
                    // Top row: severity badge on the left, time on the right.
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        SeverityBadge(severity: severity),
                        Text(time, style: AppTypography.caption),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    // Title.
                    Text(title, style: AppTypography.headingMedium),
                    const SizedBox(height: AppSpacing.sm),
                    // Description (two lines max so cards stay a similar height).
                    Text(
                      description,
                      style: AppTypography.bodyMedium,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    // Tags (only shown if there are any).
                    if (tags.isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.md),
                      Wrap(
                        spacing: AppSpacing.sm,
                        runSpacing: AppSpacing.sm,
                        children: [
                          // Tint each tag with the signal's severity colour.
                          for (final tag in tags)
                            TagChip(label: tag, color: color),
                        ],
                      ),
                    ],
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
