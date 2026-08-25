import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_icons.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// A destination shown in the "More" arc.
class MoreDestination {
  const MoreDestination(this.icon, this.label, {this.available = false});
  final IconData icon;
  final String label;

  /// False when the screen is not built yet (shown but not tappable).
  final bool available;
}

/// All the "More" destinations, in order.
const List<MoreDestination> moreDestinations = [
  MoreDestination(AppIcons.decisions, 'Decisions', available: true),
  MoreDestination(AppIcons.risks, 'Risks'),
  MoreDestination(AppIcons.opportunities, 'Opportunities'),
  MoreDestination(AppIcons.knowledgeGraph, 'Knowledge Graph'),
  MoreDestination(AppIcons.reports, 'Reports'),
  MoreDestination(AppIcons.simulations, 'Simulations'),
  MoreDestination(AppIcons.organization, 'Organization'),
  MoreDestination(AppIcons.settings, 'Settings'),
];

/// Shows the "More" menu as a curved arc that rises from the bottom-right.
///
/// Returns the index of the tapped destination, or null if dismissed.
/// [selectedIndex] is the destination currently open (highlighted).
Future<int?> showMoreSheet(BuildContext context, {int? selectedIndex}) {
  return showGeneralDialog<int>(
    context: context,
    barrierDismissible: true,
    barrierLabel: 'More',
    barrierColor: Colors.black.withValues(alpha: 0.20),
    transitionDuration: const Duration(milliseconds: 260),
    pageBuilder: (_, __, ___) => _MorePopup(selectedIndex: selectedIndex),
    transitionBuilder: (_, animation, __, child) {
      final curved =
          CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
      return FadeTransition(
        opacity: curved,
        child: SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, 0.12),
            end: Offset.zero,
          ).animate(curved),
          child: child,
        ),
      );
    },
  );
}

class _MorePopup extends StatefulWidget {
  const _MorePopup({this.selectedIndex});

  /// The currently-open destination (highlighted in the arc).
  final int? selectedIndex;

  @override
  State<_MorePopup> createState() => _MorePopupState();
}

class _MorePopupState extends State<_MorePopup> {
  static const double _itemExtent = 66; // vertical space per card
  static const int _visible = 3; // ~3 visible at a time
  static const double _radius = 150; // arc radius (smaller = more curve)
  static const double _tilt = 0.35; // how much each card rotates
  static const double _baseShift = 60; // focused card's distance from the wall

  final ScrollController _controller = ScrollController();

  double get _viewHeight => _itemExtent * _visible;

  double _targetOffset(double max) {
    final base = (widget.selectedIndex ?? 0) * _itemExtent +
        _itemExtent / 2 -
        _viewHeight / 2;
    return base.clamp(0.0, max);
  }

  @override
  void initState() {
    super.initState();
    // Start with the selected item centred.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_controller.hasClients) return;
      _controller.jumpTo(_targetOffset(_controller.position.maxScrollExtent));
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Align(
        alignment: Alignment.bottomRight,
        child: Padding(
          // Flush to the right edge so cards stay visible until they hit the
          // real wall; the cards themselves are shifted left (see _baseShift).
          padding: const EdgeInsets.only(right: 10, bottom: 72),
          child: SizedBox(
            width: 220,
            height: _viewHeight,
            child: ListView.builder(
              controller: _controller,
              itemExtent: _itemExtent,
              padding: EdgeInsets.zero,
              itemCount: moreDestinations.length,
              itemBuilder: (context, index) => AnimatedBuilder(
                animation: _controller,
                builder: (context, child) => _positioned(index, child!),
                child: _card(index),
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// Places a card on the arc: cards near the centre sit at the right edge and
  /// the others curve inwards (to the left), like a wheel turning against the
  /// right wall.
  Widget _positioned(int index, Widget child) {
    final double offset =
        _controller.hasClients ? _controller.offset : _targetOffset(1e9);
    final double itemCenter = index * _itemExtent + _itemExtent / 2;
    final double dy = itemCenter - (offset + _viewHeight / 2);
    final double clamped = dy.clamp(-_radius, _radius);

    // Horizontal push toward the right wall (0 at centre, grows outwards) so
    // off-centre cards curve into the wall instead of fanning left.
    final double dx =
        _radius - math.sqrt(_radius * _radius - clamped * clamped);
    final double angle = math.asin(clamped / _radius);

    return Transform.translate(
      // Base shift keeps the focused card left of the wall; dx pushes cards
      // toward (and into) the wall as they move away from the centre.
      offset: Offset(dx - _baseShift, 0),
      child: Transform.rotate(
        angle: angle * _tilt,
        alignment: Alignment.centerRight,
        child: child,
      ),
    );
  }

  /// One card, nav-bar style. Only the open destination is highlighted.
  Widget _card(int index) {
    final dest = moreDestinations[index];
    final bool highlighted = index == widget.selectedIndex;
    final Color color =
        highlighted ? AppColors.textPrimary : AppColors.textSecondary;

    return Align(
      alignment: Alignment.centerRight,
      child: GestureDetector(
        onTap: dest.available ? () => Navigator.of(context).pop(index) : null,
        behavior: HitTestBehavior.opaque,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.sm,
              ),
              decoration: BoxDecoration(
                color:
                    highlighted ? AppColors.surfaceMuted : Colors.transparent,
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Icon(dest.icon, size: 22, color: color),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(dest.label,
                style: AppTypography.caption.copyWith(color: color)),
          ],
        ),
      ),
    );
  }
}
