import 'package:dio/dio.dart';
import 'package:sentinel_flutter/core/errors/failures.dart';
import 'package:sentinel_flutter/core/network/api_client.dart';
import 'package:sentinel_flutter/core/network/api_result.dart';
import 'package:sentinel_flutter/core/storage/session_storage.dart';
import 'package:sentinel_flutter/models/auth_token_model.dart';
import 'package:sentinel_flutter/models/login_response_model.dart';
import 'package:sentinel_flutter/models/mfa_enroll_model.dart';
import 'package:sentinel_flutter/models/user_model.dart';
import 'package:sentinel_flutter/core/config/app_config.dart';

class AuthRepository {
  final ApiClient _apiClient;
  final SessionStorage _sessionStorage;

  AuthRepository(this._apiClient, this._sessionStorage);

  Future<ApiResult<LoginResponseModel>> login(String email, String password) async {
    try {
      final response = await _apiClient.dio.post(
        AppConfig.loginEndpoint,
        data: {'email': email, 'password': password},
      );
      final model = LoginResponseModel.fromJson(response.data as Map<String, dynamic>);
      if (!model.requiresMfa && model.tokens != null) {
        await _sessionStorage.saveTokens(
          accessToken: model.tokens!.accessToken,
          refreshToken: model.tokens!.refreshToken,
        );
      }
      return ApiSuccess(model);
    } on DioException catch (e) {
      return ApiFailure(_mapDioError(e));
    } on ParsingFailure catch (e) {
      return ApiFailure(e);
    }
  }

  Future<ApiResult<AuthTokenModel>> verifyMfa(String challengeId, String code) async {
    try {
      final response = await _apiClient.dio.post(
        AppConfig.mfaVerifyEndpoint,
        data: {'challengeId': challengeId, 'code': code},
      );
      final model = AuthTokenModel.fromJson(response.data as Map<String, dynamic>);
      await _sessionStorage.saveTokens(
        accessToken: model.accessToken,
        refreshToken: model.refreshToken,
      );
      return ApiSuccess(model);
    } on DioException catch (e) {
      return ApiFailure(_mapDioError(e));
    } on ParsingFailure catch (e) {
      return ApiFailure(e);
    }
  }

  Future<ApiResult<UserModel>> getMe() async {
    try {
      final response = await _apiClient.dio.get(AppConfig.getMeEndpoint);
      final model = UserModel.fromJson(response.data as Map<String, dynamic>);
      return ApiSuccess(model);
    } on DioException catch (e) {
      return ApiFailure(_mapDioError(e));
    } on ParsingFailure catch (e) {
      return ApiFailure(e);
    }
  }

  Future<ApiResult<MfaEnrollModel>> enrollMfa() async {
    try {
      final response = await _apiClient.dio.post(AppConfig.mfaEnrollEndpoint);
      final model = MfaEnrollModel.fromJson(response.data as Map<String, dynamic>);
      return ApiSuccess(model);
    } on DioException catch (e) {
      return ApiFailure(_mapDioError(e));
    } on ParsingFailure catch (e) {
      return ApiFailure(e);
    }
  }

  Future<ApiResult<void>> logout() async {
    try {
      await _apiClient.dio.post(AppConfig.logoutEndpoint);
      await _sessionStorage.wipeTokens();
      return ApiSuccess(null);
    } on DioException catch (e) {
      await _sessionStorage.wipeTokens();
      return ApiFailure(_mapDioError(e));
    }
  }

  Failure _mapDioError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const TimeoutFailure('Request timed out.');
      case DioExceptionType.connectionError:
        return const NetworkFailure('No internet connection.');
      case DioExceptionType.badResponse:
        final statusCode = e.response?.statusCode ?? 0;
        if (statusCode == 401) return const UnauthorizedFailure('Session expired.');
        if (statusCode == 403) return const ForbiddenFailure('Access denied.');
        if (statusCode >= 500) return ServerFailure('Server error ($statusCode).');
        return NetworkFailure('Request failed ($statusCode).');
      default:
        return const NetworkFailure('An unexpected error occurred.');
    }
  }
}
