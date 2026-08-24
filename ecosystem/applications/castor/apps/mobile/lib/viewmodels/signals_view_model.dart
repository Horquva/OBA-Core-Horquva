import 'package:flutter/foundation.dart';

import '../models/signal.dart';
import '../repositories/signals_repository.dart';
import '../views/widgets/severity_badge.dart';

/// The tab filter shown on top of the Signals screen.
enum SignalFilter { all, critical, important, informational }

/// ViewModel for the Signals screen (the "VM" in MVVM).
///
/// It asks the [SignalsRepository] for the data (which will later come from a
/// server/database), keeps [isLoading] / [error], and exposes the list plus the
/// current tab filter. The screen only reads this class — it never touches the
/// repository directly.
class SignalsViewModel extends ChangeNotifier {
  SignalsViewModel({SignalsRepository? repository})
      : _repository = repository ?? SignalsRepository();

  final SignalsRepository _repository;

  // ─── State ────────────────────────────────────────────────────────────────
  bool isLoading = false;
  String? error;

  // All signals loaded from the repository (the full, unfiltered list).
  List<Signal> _all = [];

  // Which tab is selected.
  SignalFilter filter = SignalFilter.all;

  // ─── Derived data (read by the screen) ─────────────────────────────────────
  /// The signals to show, after applying the selected tab filter.
  List<Signal> get signals {
    switch (filter) {
      case SignalFilter.all:
        return _all;
      case SignalFilter.critical:
        return _byLevel(Severity.critical);
      case SignalFilter.important:
        return _byLevel(Severity.important);
      case SignalFilter.informational:
        return _byLevel(Severity.informational);
    }
  }

  /// Counts shown next to each tab, e.g. "Critical (2)".
  int get criticalCount => _byLevel(Severity.critical).length;
  int get importantCount => _byLevel(Severity.important).length;
  int get informationalCount => _byLevel(Severity.informational).length;

  List<Signal> _byLevel(Severity level) =>
      _all.where((s) => s.severity == level).toList();

  // ─── Actions ───────────────────────────────────────────────────────────────
  /// Loads signals from the repository (server/database in the future).
  Future<void> load() async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      _all = await _repository.fetchSignals();
    } catch (e) {
      error = 'Could not load signals. Please try again.';
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  /// Changes the active tab filter and refreshes the screen.
  void setFilter(SignalFilter newFilter) {
    filter = newFilter;
    notifyListeners();
  }
}
