import 'package:flutter/material.dart';

import '../../core/adaptive_tap.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_icons.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Castor Design System — Briefing Card.
///
/// The dark green "Executive Briefing" card on the Overview screen: a small
/// [label], a serif [title] and [body] on the left with a decorative wave line
/// in the free space on the right, and a row of three tiles at the bottom.
class BriefingCard extends StatelessWidget {
  const BriefingCard({
    super.key,
    required this.label,
    required this.title,
    required this.body,
    required this.startTitle,
    required this.startSubtitle,
    required this.summaryTitle,
    required this.summarySubtitle,
    required this.estimateValue,
    required this.estimateLabel,
    this.onStart,
    this.onSummary,
  });

  /// Small label at the top, e.g. "EXECUTIVE BRIEFING".
  final String label;

  /// Serif headline, e.g. "Here's what matters most.".
  final String title;

  /// Short description under the title.
  final String body;

  /// Start tile texts, e.g. "Start Briefing" / "8 min estimated".
  final String startTitle;
  final String startSubtitle;

  /// Summary tile texts, e.g. "Summary" / "Key highlights".
  final String summaryTitle;
  final String summarySubtitle;

  /// Estimate tile texts, e.g. "72s" / "estimated".
  final String estimateValue;
  final String estimateLabel;

  /// Taps.
  final VoidCallback? onStart;
  final VoidCallback? onSummary;

  // A light colour used for text/tiles on the dark green card.
  static const Color _onDark = AppColors.onPrimary;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.primaryDark,
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Top area: text on the left, a decorative wave filling the free
          // space on the right. A Stack lets the height grow with the text, so
          // it never overflows (e.g. when the text wraps to more lines).
          Stack(
            children: [
              const Positioned(
                right: 0,
                top: 0,
                bottom: 0,
                width: 110,
                child: CustomPaint(
                  painter: _WavePainter(),
                  child: SizedBox.expand(),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(right: 110),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      label,
                      style: AppTypography.overline.copyWith(
                        color: _onDark.withValues(alpha: 0.7),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      title,
                      style: AppTypography.displayMedium
                          .copyWith(color: _onDark),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      body,
                      style: AppTypography.bodyMedium.copyWith(
                        color: _onDark.withValues(alpha: 0.8),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          // Bottom row: three tiles, all the same height.
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(flex: 6, child: _startTile()),
                const SizedBox(width: AppSpacing.sm),
                Expanded(flex: 6, child: _summaryTile()),
                const SizedBox(width: AppSpacing.sm),
                Expanded(flex: 4, child: _estimateTile()),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Start Briefing — a light (cream) tile with a filled dark play circle.
  Widget _startTile() {
    return AdaptiveTap(
      onTap: onStart,
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.sm),
        decoration: BoxDecoration(
          color: _onDark,
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              alignment: Alignment.center,
              decoration: const BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
              ),
              child: const Icon(AppIcons.play, color: _onDark, size: 16),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(child: _twoLines(startTitle, startSubtitle, dark: true)),
          ],
        ),
      ),
    );
  }

  /// Summary — a translucent tile with a document icon.
  Widget _summaryTile() {
    return AdaptiveTap(
      onTap: onSummary,
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.sm),
        decoration: BoxDecoration(
          color: _onDark.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: Row(
          children: [
            const Icon(AppIcons.document, color: _onDark, size: 20),
            const SizedBox(width: AppSpacing.sm),
            Expanded(child: _twoLines(summaryTitle, summarySubtitle, dark: false)),
          ],
        ),
      ),
    );
  }

  /// Estimate — a translucent tile with a big value and a small label.
  Widget _estimateTile() {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: _onDark.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(estimateValue,
              style: AppTypography.titleMedium.copyWith(color: _onDark)),
          Text(
            estimateLabel,
            style: AppTypography.caption.copyWith(
              color: _onDark.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }

  /// A title + subtitle stack, dark text (on cream) or light text (on green).
  Widget _twoLines(String title, String subtitle, {required bool dark}) {
    final Color titleColor = dark ? AppColors.textPrimary : _onDark;
    final Color subColor =
        dark ? AppColors.textSecondary : _onDark.withValues(alpha: 0.7);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: AppTypography.label.copyWith(color: titleColor),
        ),
        Text(
          subtitle,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: AppTypography.caption.copyWith(color: subColor),
        ),
      ],
    );
  }
}

/// Draws the subtle flowing wave line (with a glowing dot) in the top-right of
/// the briefing card.
class _WavePainter extends CustomPainter {
  const _WavePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final Paint line = Paint()
      ..color = AppColors.onPrimary.withValues(alpha: 0.30)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5
      ..strokeCap = StrokeCap.round;

    final Path path = Path()
      ..moveTo(0, size.height * 0.72)
      ..cubicTo(
        size.width * 0.35, size.height * 0.30,
        size.width * 0.55, size.height * 0.95,
        size.width * 0.85, size.height * 0.45,
      );
    canvas.drawPath(path, line);

    // A small glowing dot at the end of the line.
    final Offset dot = Offset(size.width * 0.85, size.height * 0.45);
    canvas.drawCircle(
      dot,
      6,
      Paint()..color = AppColors.onPrimary.withValues(alpha: 0.15),
    );
    canvas.drawCircle(
      dot,
      2.5,
      Paint()..color = AppColors.onPrimary.withValues(alpha: 0.9),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
