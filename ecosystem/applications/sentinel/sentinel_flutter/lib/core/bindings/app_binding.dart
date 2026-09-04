import 'package:get/get.dart';
import 'package:sentinel_flutter/core/network/api_client.dart';
import 'package:sentinel_flutter/core/repositories/auth_repository.dart';
import 'package:sentinel_flutter/core/repositories/authz_repository.dart';
import 'package:sentinel_flutter/core/storage/session_storage.dart';
import 'package:sentinel_flutter/state/auth_controller.dart';
import 'package:sentinel_flutter/state/findings_controller.dart';
import 'package:sentinel_flutter/state/security_events_controller.dart';

class AppBinding extends Bindings {
  @override
  void dependencies() {
    final sessionStorage = SessionStorage();
    final apiClient = ApiClient(sessionStorage: sessionStorage);

    Get.put(sessionStorage, permanent: true);
    Get.put(apiClient, permanent: true);

    Get.put(
      AuthRepository(apiClient, sessionStorage),
      permanent: true,
    );
    Get.put(
      AuthzRepository(apiClient),
      permanent: true,
    );

    Get.put(
      AuthController(Get.find<AuthRepository>()),
      permanent: true,
    );
    Get.put(FindingsController(), permanent: true);
    Get.put(SecurityEventsController(), permanent: true);
  }
}
