import 'dart:io';

/// Simple platform check.
///
/// Used across the app to pick Cupertino (iOS) vs Material (Android) widgets.
abstract final class AppPlatform {
  AppPlatform._();

  /// True when running on an iPhone/iPad.
  static bool get isIOS => Platform.isIOS;

  /// True when running on Android.
  static bool get isAndroid => Platform.isAndroid;
}
