import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'app_platform.dart';

/// A tap wrapper that feels native on each platform:
///  - iOS: an opacity fade (Cupertino style).
///  - Android: a ripple (Material InkWell).
///
/// Use this instead of a bare InkWell so taps match the platform automatically.
class AdaptiveTap extends StatelessWidget {
  const AdaptiveTap({
    super.key,
    required this.child,
    this.onTap,
    this.borderRadius,
  });

  /// The content to make tappable.
  final Widget child;

  /// Called when tapped. Null disables the tap.
  final VoidCallback? onTap;

  /// Rounds the Android ripple to this shape (ignored on iOS).
  final BorderRadius? borderRadius;

  @override
  Widget build(BuildContext context) {
    // iOS: no ripple — a simple press with an opacity fade.
    if (AppPlatform.isIOS) {
      return CupertinoButton(
        padding: EdgeInsets.zero,
        minimumSize: Size.zero,
        onPressed: onTap,
        child: child,
      );
    }

    // Android: Material ripple.
    return InkWell(
      onTap: onTap,
      borderRadius: borderRadius,
      child: child,
    );
  }
}
