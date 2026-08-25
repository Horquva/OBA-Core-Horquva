import 'package:flutter/foundation.dart';

import '../models/decision.dart';
import '../repositories/decisions_repository.dart';

/// The tab filter on the Decisions screen.
enum DecisionFilter { all, urgent, high, medium }

/// ViewModel for the Decisions screen.
///
/// Loads decisions from the [DecisionsRepository] (server/database in the
/// future), keeps [isLoading] / [error], and exposes the list plus the current
/// tab filter and per-priority counts.
class DecisionsViewModel extends ChangeNotifier {
  DecisionsViewModel({DecisionsRepository? repository})
      : _repository = repository ?? DecisionsRepository();

  final DecisionsRepository _repository;

  bool isLoading = false;
  String? error;

  List<Decision> _all = [];
  DecisionFilter filter = DecisionFilter.all;

  /// The decisions to show, after applying the selected tab.
  List<Decision> get decisions {
    switch (filter) {
      case DecisionFilter.all:
        return _all;
      case DecisionFilter.urgent:
        return _byPriority(DecisionPriority.urgent);
      case DecisionFilter.high:
        return _byPriority(DecisionPriority.high);
      case DecisionFilter.medium:
        return _byPriority(DecisionPriority.medium);
    }
  }

  // Counts shown on the tabs, e.g. "Urgent (1)".
  int get allCount => _all.length;
  int get urgentCount => _byPriority(DecisionPriority.urgent).length;
  int get highCount => _byPriority(DecisionPriority.high).length;
  int get mediumCount => _byPriority(DecisionPriority.medium).length;

  List<Decision> _byPriority(DecisionPriority p) =>
      _all.where((d) => d.priority == p).toList();

  /// Loads decisions from the repository.
  Future<void> load() async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      _all = await _repository.fetchDecisions();
    } catch (e) {
      error = 'Could not load decisions. Please try again.';
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  /// Changes the active tab and refreshes the screen.
  void setFilter(DecisionFilter newFilter) {
    filter = newFilter;
    notifyListeners();
  }
}
