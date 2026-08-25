import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Castor Design System — Performance Card.
///
/// A dark card with a [heading], a big [value] (e.g. "Strong"), a [caption], and
/// a circular gauge showing [score] out of [scoreMax] (e.g. 92 / 100). All text
/// and numbers come from the caller — nothing is hard-coded.
class PerformanceCard extends StatelessWidget {
  const PerformanceCard({
    super.key,
    this.heading = 'Overall Performance',
    required this.value,
    required this.caption,
    required this.score,
    required this.scoreMax,
  });

  /// Small label at the top, e.g. "Overall Performance".
  final String heading;

  /// The big word, e.g. "Strong".
  final String value;

  /// The line under the value.
  final String caption;

  /// The score shown in the gauge, e.g. 92.
  final int score;

  /// The maximum score, e.g. 100.
  final int scoreMax;

  @override
  Widget build(BuildContext context) {
    final Color faded = AppColors.onPrimary.withValues(alpha: 0.7);

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.xl,
      ),
      decoration: BoxDecoration(
        // A darker forest green than the shared primaryDark token.
        color: const Color(0xFF0F1F18),
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(heading, style: AppTypography.label.copyWith(color: faded)),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  value,
                  style: AppTypography.displayLarge
                      .copyWith(color: AppColors.onPrimary),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(caption,
                    style: AppTypography.bodyMedium.copyWith(color: faded)),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          _gauge(),
        ],
      ),
    );
  }

  Widget _gauge() {
    return SizedBox(
      width: 124,
      height: 124,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: const Size(124, 124),
            painter: _GaugePainter(
              progress: score / scoreMax,
              trackColor: AppColors.onPrimary.withValues(alpha: 0.12),
            ),
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$score',
                style: AppTypography.headingLarge
                    .copyWith(color: AppColors.onPrimary),
              ),
              Text(
                '/$scoreMax',
                style: AppTypography.caption.copyWith(
                  color: AppColors.onPrimary.withValues(alpha: 0.6),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Paints the gauge: a faint full-circle track and a green gradient arc with
/// rounded ends, starting at the top and sweeping clockwise by [progress].
class _GaugePainter extends CustomPainter {
  _GaugePainter({required this.progress, required this.trackColor});

  final double progress; // 0..1
  final Color trackColor;

  // The green gradient used for the value arc.
  static const Color _greenDark = Color(0xFF4FA373);
  static const Color _greenLight = Color(0xFFAEE6B0);

  @override
  void paint(Canvas canvas, Size size) {
    const double stroke = 8;
    final Offset center = size.center(Offset.zero);
    final double r = size.shortestSide / 2;
    const double start = -math.pi / 2; // 12 o'clock

    // Outer circumference ring around the whole gauge.
    final Paint ringPaint = Paint()
      ..color = AppColors.onPrimary.withValues(alpha: 0.20)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    canvas.drawCircle(center, r - 1, ringPaint);

    // The gauge sits inside the ring, with a gap so the ring stands out.
    final double radius = r - 15;
    final Rect arcRect = Rect.fromCircle(center: center, radius: radius);

    // Track (full circle).
    final Paint trackPaint = Paint()
      ..color = trackColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(arcRect, 0, 2 * math.pi, false, trackPaint);

    // Value arc with a sweep gradient.
    final Paint valuePaint = Paint()
      ..shader = const SweepGradient(
        colors: [_greenDark, _greenLight],
        transform: GradientRotation(start),
      ).createShader(arcRect)
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(arcRect, start, 2 * math.pi * progress, false, valuePaint);
  }

  @override
  bool shouldRepaint(covariant _GaugePainter old) =>
      old.progress != progress || old.trackColor != trackColor;
}
