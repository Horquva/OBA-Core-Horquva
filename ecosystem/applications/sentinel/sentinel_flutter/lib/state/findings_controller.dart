import 'package:get/get.dart';
import 'package:sentinel_flutter/models/finding_model.dart';

sealed class FindingsState {}
class FindingsInitial extends FindingsState {}
class FindingsLoading extends FindingsState {}
class FindingsSuccess extends FindingsState {
  final List<FindingModel> findings;
  FindingsSuccess(this.findings);
}
class FindingsEmpty extends FindingsState {}
class FindingsError extends FindingsState {
  final String message;
  FindingsError(this.message);
}
class FindingsUnavailable extends FindingsState {}

class FindingsController extends GetxController {
  final Rx<FindingsState> state = Rx<FindingsState>(FindingsInitial());

  @override
  void onInit() {
    super.onInit();
    _markUnavailable();
  }

  void _markUnavailable() {
    // Findings endpoint not yet confirmed — expose honest unavailable state.
    // Update to call FindingsRepository once the backend endpoint is provided.
    state.value = FindingsUnavailable();
  }
}
