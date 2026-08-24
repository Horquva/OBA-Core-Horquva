import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart' show Color, IconData;

import '../theme/app_colors.dart';
import '../theme/app_icons.dart';
import '../views/widgets/severity_badge.dart';

/// A single KPI stat shown on the Overview.
class StatData {
  const StatData({
    required this.icon,
    required this.value,
    required this.label,
    this.iconColor,
  });
  final IconData icon;
  final String value;
  final String label;
  final Color? iconColor;
}

/// A featured signal shown in the Overview carousel.
class HighlightData {
  const HighlightData({
    required this.severity,
    required this.number,
    required this.title,
    required this.meta,
  });
  final Severity severity;
  final String number;
  final String title;
  final String meta;
}

/// ViewModel for the Overview screen (the "VM" in MVVM).
///
/// A plain [ChangeNotifier]: it holds the data plus [isLoading] / [error], and
/// notifies the View when they change. Data here is DEMO (sample data).
class OverviewViewModel extends ChangeNotifier {
  // ─── State ──────────────────────────────────────────────────────────────
  bool isLoading = false;
  String? error;

  // ─── Data ───────────────────────────────────────────────────────────────
  String greeting = 'Good morning, Dur Muhammad Khan.';
  String subtitle = 'Your organization changed overnight.';
  List<StatData> stats = [];
  List<HighlightData> highlights = [];

  /// Loads the DEMO overview data (simulates fetching from a repository).
  Future<void> load() async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      // Simulate a short delay so the loading state is visible.
      await Future<void>.delayed(const Duration(milliseconds: 500));

      stats = const [
        StatData(
          icon: AppIcons.signals,
          value: '12,481',
          label: 'Signals analyzed',
        ),
        StatData(icon: AppIcons.sparkle, value: '7', label: 'Material changes'),
        StatData(
          icon: AppIcons.attention,
          value: '2',
          label: 'Require your attention',
          iconColor: AppColors.accent,
        ),
      ];

      highlights = const [
        HighlightData(
          severity: Severity.critical,
          number: '01',
          title: 'Vendor dependency has created a continuity exposure.',
          meta: 'Business Impact: High  •  Probability: Likely',
        ),
        HighlightData(
          severity: Severity.important,
          number: '02',
          title: 'Q2 revenue forecast updated.',
          meta: 'Business Impact: Medium  •  Probability: Likely',
        ),
      ];
    } catch (e) {
      error = 'Could not load your overview. Please try again.';
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
