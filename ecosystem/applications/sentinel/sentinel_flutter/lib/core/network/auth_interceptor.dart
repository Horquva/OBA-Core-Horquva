import 'package:dio/dio.dart';
import '../storage/session_storage.dart';
import '../config/app_config.dart';

class AuthInterceptor extends Interceptor {
  final SessionStorage _sessionStorage;
  final Dio _dio;

  AuthInterceptor(this._sessionStorage, this._dio);

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final accessToken = await _sessionStorage.getAccessToken();
    if (accessToken != null) {
      options.headers['Authorization'] = 'Bearer $accessToken';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Avoid infinite loops by checking if the failed request was a refresh attempt itself
      if (err.requestOptions.path == AppConfig.refreshEndpoint) {
        await _sessionStorage.wipeTokens();
        return handler.next(err);
      }

      final refreshToken = await _sessionStorage.getRefreshToken();
      if (refreshToken == null) {
        await _sessionStorage.wipeTokens();
        return handler.next(err);
      }

      try {
        final refreshResponse = await _dio.post(
          AppConfig.refreshEndpoint,
          data: {'refreshToken': refreshToken},
        );

        final newAccessToken = refreshResponse.data['accessToken'] as String?;
        final newRefreshToken = refreshResponse.data['refreshToken'] as String?;

        if (newAccessToken != null && newRefreshToken != null) {
          await _sessionStorage.saveTokens(
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          );

          final opts = err.requestOptions;
          opts.headers['Authorization'] = 'Bearer $newAccessToken';
          final retryResponse = await _dio.fetch(opts);
          return handler.resolve(retryResponse);
        } else {
          await _sessionStorage.wipeTokens();
          return handler.next(err);
        }
      } catch (e) {
        await _sessionStorage.wipeTokens();
        return handler.next(err);
      }
    }

    return handler.next(err);
  }
}
