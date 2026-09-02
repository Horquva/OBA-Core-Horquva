import 'package:flutter/foundation.dart';

import '../models/signal_detail.dart';
import '../repositories/signals_repository.dart';

/// ViewModel for the Signal Detail screen.
///
/// Given a signal [id], it asks the repository for that signal's full details
/// (server/database in the future) and keeps [isLoading] / [error] / [detail].
class SignalDetailViewModel extends ChangeNotifier {
  SignalDetailViewModel({SignalsRepository? repository})
      : _repository = repository ?? SignalsRepository();

  final SignalsRepository _repository;

  bool isLoading = false;
  String? error;
  SignalDetail? detail;

  /// Loads the details for the signal with this [id].
  Future<void> load(String id) async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      detail = await _repository.fetchSignalDetail(id);
    } catch (e) {
      error = 'Could not load this signal. Please try again.';
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
