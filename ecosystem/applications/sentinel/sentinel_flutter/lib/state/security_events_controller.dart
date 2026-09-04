import 'package:get/get.dart';
import 'package:sentinel_flutter/models/security_event_model.dart';

sealed class SecurityEventsState {}
class SecurityEventsInitial extends SecurityEventsState {}
class SecurityEventsLoading extends SecurityEventsState {}
class SecurityEventsSuccess extends SecurityEventsState {
  final List<SecurityEventModel> events;
  SecurityEventsSuccess(this.events);
}
class SecurityEventsEmpty extends SecurityEventsState {}
class SecurityEventsError extends SecurityEventsState {
  final String message;
  SecurityEventsError(this.message);
}
class SecurityEventsUnavailable extends SecurityEventsState {}

class SecurityEventsController extends GetxController {
  final Rx<SecurityEventsState> state = Rx<SecurityEventsState>(SecurityEventsInitial());

  @override
  void onInit() {
    super.onInit();
    _markUnavailable();
  }

  void _markUnavailable() {
    // Security events endpoint not yet confirmed — expose honest unavailable state.
    // Update to call SecurityEventsRepository once the backend endpoint is provided.
    state.value = SecurityEventsUnavailable();
  }
}
