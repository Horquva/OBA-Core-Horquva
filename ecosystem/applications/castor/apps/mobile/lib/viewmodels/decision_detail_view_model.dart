import 'package:flutter/foundation.dart';

import '../models/decision_detail.dart';
import '../repositories/decisions_repository.dart';

/// ViewModel for the Decision Detail screen.
///
/// Given a decision [id], it asks the repository for that decision's full
/// details (server/database in the future) and keeps [isLoading] / [error] /
/// [detail].
class DecisionDetailViewModel extends ChangeNotifier {
  DecisionDetailViewModel({DecisionsRepository? repository})
      : _repository = repository ?? DecisionsRepository();

  final DecisionsRepository _repository;

  bool isLoading = false;
  String? error;
  DecisionDetail? detail;

  /// Loads the details for the decision with this [id].
  Future<void> load(String id) async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      detail = await _repository.fetchDecisionDetail(id);
    } catch (e) {
      error = 'Could not load this decision. Please try again.';
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
