import 'package:flutter/foundation.dart';

import '../models/briefing.dart';
import '../repositories/briefing_repository.dart';

/// The content tabs on the Briefing screen.
enum BriefingTab { summary, keyChanges, impact, recommendations }

/// ViewModel for the Executive Briefing screen.
class BriefingViewModel extends ChangeNotifier {
  BriefingViewModel({BriefingRepository? repository})
      : _repository = repository ?? BriefingRepository();

  final BriefingRepository _repository;

  bool isLoading = false;
  String? error;
  Briefing? briefing;
  BriefingTab tab = BriefingTab.summary;

  Future<void> load() async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      briefing = await _repository.fetchBriefing();
    } catch (e) {
      error = 'Could not load the briefing. Please try again.';
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  void setTab(BriefingTab newTab) {
    tab = newTab;
    notifyListeners();
  }
}
