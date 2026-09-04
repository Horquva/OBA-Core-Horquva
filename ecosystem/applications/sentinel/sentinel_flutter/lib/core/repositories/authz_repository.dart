import 'package:dio/dio.dart';
import 'package:sentinel_flutter/core/config/app_config.dart';
import 'package:sentinel_flutter/core/errors/failures.dart';
import 'package:sentinel_flutter/core/network/api_client.dart';
import 'package:sentinel_flutter/core/network/api_result.dart';
import 'package:sentinel_flutter/models/authz_decision_model.dart';

class AuthzRepository {
  final ApiClient _apiClient;

  AuthzRepository(this._apiClient);

  Future<ApiResult<AuthzDecisionModel>> check({
    required String resource,
    required String action,
  }) async {
    try {
      final response = await _apiClient.dio.post(
        AppConfig.authzCheckEndpoint,
        data: {'resource': resource, 'action': action},
      );
      final model = AuthzDecisionModel.fromJson(response.data as Map<String, dynamic>);
      return ApiSuccess(model);
    } on DioException catch (e) {
      return ApiFailure(_mapDioError(e));
    } on ParsingFailure catch (e) {
      return ApiFailure(e);
    }
  }

  Future<ApiResult<List<String>>> getPermissions() async {
    try {
      final response = await _apiClient.dio.get(AppConfig.authzPermissionsEndpoint);
      final raw = response.data;
      if (raw is! List) {
        throw const ParsingFailure('AuthzRepository: permissions must be a list');
      }
      final permissions = <String>[];
      for (final item in raw) {
        if (item is! String) {
          throw const ParsingFailure('AuthzRepository: each permission must be a string');
        }
        permissions.add(item);
      }
      return ApiSuccess(permissions);
    } on DioException catch (e) {
      return ApiFailure(_mapDioError(e));
    } on ParsingFailure catch (e) {
      return ApiFailure(e);
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
