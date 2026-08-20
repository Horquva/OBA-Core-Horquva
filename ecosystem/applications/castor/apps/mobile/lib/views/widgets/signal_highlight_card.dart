import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_icons.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import 'pill_button.dart';
import 'severity_badge.dart';

/// Castor Design System — Signal Highlight Card.
///
/// The big featured-signal card on the Overview (shown inside a swipeable
/// carousel): a "01" number and severity badge on top, a large severity logo on
/// the right, a serif [title], a [meta] line, and a call-to-action button.
class SignalHighlightCard extends StatelessWidget {
  const SignalHighlightCard({
    super.key,
    required this.severity,
    required this.number,
    required this.title,
    required this.meta,
    required this.actionLabel,
    this.onAction,
  });

  /// Drives the severity badge, logo and its colour.
  final Severity severity;

  /// The small position number, e.g. "01".
  final String number;

  /// The serif headline.
  final String title;

  /// A short line, e.g. "Business Impact: High • Probability: Likely".
  final String meta;

  /// The call-to-action label, e.g. "Review & Take Action".
  final String actionLabel;

  /// Tap for the action button.
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    // The logo and its colour come from the severity (same icon as signals).
    final Color color = severityColor(severity);
    final IconData logo = severityIcon(severity);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
      ),
      child: Stack(
        children: [
          // Big severity logo on the right, with a faint tinted glow.
          Positioned(
            right: 0,
            top: 0,
            bottom: 0,
            child: Center(
              child: Container(
                width: 108,
                height: 108,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.08),
                  shape: BoxShape.circle,
                ),
                child: Icon(logo, color: color, size: 84),
              ),
            ),
          ),
          // Content on the left; right padding keeps it clear of the logo.
          Padding(
            padding: const EdgeInsets.only(right: 112),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // "01" number badge + severity badge.
                Row(
                  children: [
                    Container(
                      width: 26,
                      height: 26,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        number,
                        style: AppTypography.overline.copyWith(color: color),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    SeverityBadge(severity: severity),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Text(title, style: AppTypography.headingLarge),
                const SizedBox(height: AppSpacing.sm),
                Text(meta, style: AppTypography.bodyMedium),
                const SizedBox(height: AppSpacing.lg),
                // Smaller CTA — hugs its content (not full width).
                PillButton(
                  label: actionLabel,
                  icon: AppIcons.send,
                  onPressed: onAction,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
