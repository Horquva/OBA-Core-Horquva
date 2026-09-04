import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:dio/dio.dart';
import 'package:sentinel_flutter/core/network/api_client.dart';
import 'package:sentinel_flutter/core/storage/session_storage.dart';
import 'package:sentinel_flutter/core/repositories/auth_repository.dart';
import 'package:sentinel_flutter/core/network/api_result.dart';
import 'package:sentinel_flutter/core/errors/failures.dart';
import 'package:sentinel_flutter/models/login_response_model.dart';

class MockApiClient extends Mock implements ApiClient {}
class MockDio extends Mock implements Dio {}
class MockSessionStorage extends Mock implements SessionStorage {}

void main() {
  late AuthRepository repository;
  late MockApiClient mockApiClient;
  late MockDio mockDio;
  late MockSessionStorage mockSessionStorage;

  setUp(() {
    mockApiClient = MockApiClient();
    mockDio = MockDio();
    mockSessionStorage = MockSessionStorage();

    when(() => mockApiClient.dio).thenReturn(mockDio);
    
    repository = AuthRepository(mockApiClient, mockSessionStorage);
  });

  group('AuthRepository', () {
    test('login returns ApiSuccess on valid 200 response', () async {
      // Arrange
      final responseData = {
        'accessToken': 'valid_access_token',
        'refreshToken': 'valid_refresh_token',
      };

      when(() => mockDio.post(any(), data: any(named: 'data')))
          .thenAnswer((_) async => Response(
                requestOptions: RequestOptions(path: ''),
                data: responseData,
                statusCode: 200,
              ));

      when(() => mockSessionStorage.saveTokens(
            accessToken: any(named: 'accessToken'),
            refreshToken: any(named: 'refreshToken'),
          )).thenAnswer((_) async => Future.value());

      // Act
      final result = await repository.login('test@example.com', 'password123');

      // Assert
      expect(result, isA<ApiSuccess<LoginResponseModel>>());
      final success = result as ApiSuccess<LoginResponseModel>;
      expect(success.data.tokens?.accessToken, 'valid_access_token');
      
      verify(() => mockSessionStorage.saveTokens(
            accessToken: 'valid_access_token',
            refreshToken: 'valid_refresh_token',
          )).called(1);
    });

    test('login returns ApiFailure with UnauthorizedFailure on 401', () async {
      // Arrange
      when(() => mockDio.post(any(), data: any(named: 'data')))
          .thenThrow(DioException(
            requestOptions: RequestOptions(path: ''),
            type: DioExceptionType.badResponse,
            response: Response(requestOptions: RequestOptions(path: ''), statusCode: 401),
          ));

      // Act
      final result = await repository.login('test@example.com', 'wrongpassword');

      // Assert
      expect(result, isA<ApiFailure<LoginResponseModel>>());
      final failure = (result as ApiFailure<LoginResponseModel>).failure;
      expect(failure, isA<UnauthorizedFailure>());
    });

    test('login returns ApiFailure with NetworkFailure on timeout', () async {
      // Arrange
      when(() => mockDio.post(any(), data: any(named: 'data')))
          .thenThrow(DioException(
            requestOptions: RequestOptions(path: ''),
            type: DioExceptionType.connectionTimeout,
          ));

      // Act
      final result = await repository.login('test@example.com', 'password');

      // Assert
      expect(result, isA<ApiFailure<LoginResponseModel>>());
      final failure = (result as ApiFailure<LoginResponseModel>).failure;
      expect(failure, isA<TimeoutFailure>());
    });
  });
}
