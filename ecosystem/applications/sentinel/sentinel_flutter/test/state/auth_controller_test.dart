import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:sentinel_flutter/core/network/api_result.dart';
import 'package:sentinel_flutter/core/repositories/auth_repository.dart';
import 'package:sentinel_flutter/models/login_response_model.dart';
import 'package:sentinel_flutter/models/user_model.dart';
import 'package:sentinel_flutter/models/auth_token_model.dart';
import 'package:sentinel_flutter/state/auth_controller.dart';
import 'package:sentinel_flutter/core/errors/failures.dart';

class MockAuthRepository extends Mock implements AuthRepository {}

void main() {
  late AuthController controller;
  late MockAuthRepository mockAuthRepository;

  setUp(() {
    mockAuthRepository = MockAuthRepository();
    controller = AuthController(mockAuthRepository);
  });

  group('AuthController', () {
    test('initial state is unauthenticated', () {
      expect(controller.status.value, AuthStatus.unauthenticated);
      expect(controller.currentUser.value, isNull);
    });

    test('login success transitions to authenticated state and loads user', () async {
      // Arrange
      final loginModel = LoginResponseModel.fromJson({
        'accessToken': 'access',
        'refreshToken': 'refresh',
      });
      final userModel = UserModel(
        principalId: 'p-1',
        organizationId: 'o-1',
        kind: 'human',
        permissions: [],
      );

      when(() => mockAuthRepository.login(any(), any()))
          .thenAnswer((_) async => ApiSuccess(loginModel));
      when(() => mockAuthRepository.getMe())
          .thenAnswer((_) async => ApiSuccess(userModel));

      // Act
      await controller.login('test@example.com', 'password');

      // Assert
      expect(controller.status.value, AuthStatus.authenticated);
      expect(controller.currentUser.value, userModel);
    });

    test('login failure stays unauthenticated and sets error message', () async {
      // Arrange
      when(() => mockAuthRepository.login(any(), any()))
          .thenAnswer((_) async => ApiFailure(const UnauthorizedFailure('Invalid credentials')));

      // Act
      await controller.login('test@example.com', 'wrong');

      // Assert
      expect(controller.status.value, AuthStatus.unauthenticated);
      expect(controller.errorMessage.value, 'Invalid credentials');
      expect(controller.currentUser.value, isNull);
    });
  });
}
