import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart' show Color, IconData;

import '../models/signal.dart';
import '../repositories/signals_repository.dart';
import '../theme/app_colors.dart';
import '../theme/app_icons.dart';

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

/// ViewModel for the Overview screen (the "VM" in MVVM).
///
/// A plain [ChangeNotifier]. The stats are demo data; the featured signals come
/// from the SAME [SignalsRepository] the Signals screen uses, so both screens
/// show one shared set of signals (the Overview just shows the top few).
class OverviewViewModel extends ChangeNotifier {
  OverviewViewModel({SignalsRepository? signalsRepository})
      : _signalsRepository = signalsRepository ?? SignalsRepository();

  final SignalsRepository _signalsRepository;

  // ─── State ──────────────────────────────────────────────────────────────
  bool isLoading = false;
  String? error;

  // ─── Data ───────────────────────────────────────────────────────────────
  String greeting = 'Good morning, Dur Muhammad Khan.';
  String subtitle = 'Your organization changed overnight.';
  List<StatData> stats = [];

  /// The featured signals shown in the Overview carousel — the same signals as
  /// the Signals screen, limited to the top 5.
  List<Signal> topSignals = [];

  /// Loads the Overview data.
  Future<void> load() async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
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

      // Same repository as the Signals screen; keep only the top 5 here.
      final all = await _signalsRepository.fetchSignals();
      topSignals = all.take(5).toList();
    } catch (e) {
      error = 'Could not load your overview. Please try again.';
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
