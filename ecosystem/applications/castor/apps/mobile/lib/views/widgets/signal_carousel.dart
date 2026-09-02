import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';

/// Castor Design System — Signal Carousel.
///
/// Shows a list of cards (usually [SignalHighlightCard]s) that the user can
/// swipe left/right. Moving to the next page shows the next card, and the dots
/// below indicate the current position.
class SignalCarousel extends StatefulWidget {
  const SignalCarousel({
    super.key,
    required this.cards,
    this.height = 280,
  });

  /// The cards to swipe through.
  final List<Widget> cards;

  /// The fixed height of the swipe area (a PageView needs a bounded height).
  final double height;

  @override
  State<SignalCarousel> createState() => _SignalCarouselState();
}

class _SignalCarouselState extends State<SignalCarousel> {
  final PageController _controller = PageController();
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: widget.height,
      child: Stack(
        children: [
          PageView.builder(
            controller: _controller,
            itemCount: widget.cards.length,
            onPageChanged: (i) => setState(() => _page = i),
            itemBuilder: (context, i) => widget.cards[i],
          ),
          // Dots overlaid near the bottom, so they sit ON the card.
          Positioned(
            left: 0,
            right: 0,
            bottom: AppSpacing.lg,
            child: _dots(),
          ),
        ],
      ),
    );
  }

  /// The row of dots; the active one is wider and gold.
  Widget _dots() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (int i = 0; i < widget.cards.length; i++)
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 3),
            width: i == _page ? 18 : 6,
            height: 6,
            decoration: BoxDecoration(
              color: i == _page ? AppColors.accent : AppColors.borderStrong,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
      ],
    );
  }
}
