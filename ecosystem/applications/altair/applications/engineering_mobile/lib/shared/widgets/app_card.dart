import 'package:flutter/material.dart';
import '../../core/constants/app_dimensions.dart';

class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double? elevation;
  final double? borderRadius;
  final Color? color;
  final VoidCallback? onTap;
  final EdgeInsets? insetPadding;

  const AppCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.elevation,
    this.borderRadius,
    this.color,
    this.onTap,
    this.insetPadding,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final card = Card(
      elevation: elevation ?? AppDimensions.cardElevation,
      color: color ?? theme.colorScheme.surface,
      margin: margin ?? EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(borderRadius ?? AppDimensions.radiusMd),
      ),
      child: Padding(
        padding: padding ?? const EdgeInsets.all(AppDimensions.md),
        child: child,
      ),
    );

    if (onTap != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(borderRadius ?? AppDimensions.radiusMd),
        child: card,
      );
    }

    return card;
  }
}
