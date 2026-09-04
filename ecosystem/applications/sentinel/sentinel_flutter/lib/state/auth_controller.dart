import 'package:get/get.dart';
import 'package:sentinel_flutter/core/network/api_result.dart';
import 'package:sentinel_flutter/core/repositories/auth_repository.dart';
import 'package:sentinel_flutter/models/login_response_model.dart';
import 'package:sentinel_flutter/models/user_model.dart';

enum AuthStatus { unauthenticated, authenticating, mfaRequired, authenticated, sessionExpired }

class AuthController extends GetxController {
  final AuthRepository _authRepository;

  AuthController(this._authRepository);

  final Rx<AuthStatus> status = AuthStatus.unauthenticated.obs;
  final Rx<UserModel?> currentUser = Rx<UserModel?>(null);
  final RxString errorMessage = ''.obs;
  String? _pendingMfaChallengeId;

  String? get pendingMfaChallengeId => _pendingMfaChallengeId;
  bool get isAuthenticated => status.value == AuthStatus.authenticated;

  Future<void> login(String email, String password) async {
    status.value = AuthStatus.authenticating;
    errorMessage.value = '';

    final result = await _authRepository.login(email, password);

    switch (result) {
      case ApiSuccess<LoginResponseModel>(:final data):
        if (data.requiresMfa) {
          _pendingMfaChallengeId = data.challengeId;
          status.value = AuthStatus.mfaRequired;
        } else {
          await _loadCurrentUser();
        }
      case ApiFailure<LoginResponseModel>(:final failure):
        status.value = AuthStatus.unauthenticated;
        errorMessage.value = failure.message;
    }
  }

  Future<void> verifyMfa(String code) async {
    if (_pendingMfaChallengeId == null) return;

    status.value = AuthStatus.authenticating;
    errorMessage.value = '';

    final result = await _authRepository.verifyMfa(_pendingMfaChallengeId!, code);

    switch (result) {
      case ApiSuccess():
        _pendingMfaChallengeId = null;
        await _loadCurrentUser();
      case ApiFailure(:final failure):
        status.value = AuthStatus.mfaRequired;
        errorMessage.value = failure.message;
    }
  }

  Future<void> logout() async {
    await _authRepository.logout();
    currentUser.value = null;
    _pendingMfaChallengeId = null;
    status.value = AuthStatus.unauthenticated;
  }

  void markSessionExpired() {
    currentUser.value = null;
    status.value = AuthStatus.sessionExpired;
  }

  Future<void> _loadCurrentUser() async {
    final result = await _authRepository.getMe();
    switch (result) {
      case ApiSuccess<UserModel>(:final data):
        currentUser.value = data;
        status.value = AuthStatus.authenticated;
      case ApiFailure(:final failure):
        status.value = AuthStatus.unauthenticated;
        errorMessage.value = failure.message;
    }
  }
}
