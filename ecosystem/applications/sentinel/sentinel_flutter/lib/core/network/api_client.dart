import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../storage/session_storage.dart';
import 'auth_interceptor.dart';

class ApiClient {
  late final Dio _dio;
  
  ApiClient({SessionStorage? sessionStorage, Dio? dio}) {
    _dio = dio ?? Dio(BaseOptions(
      baseUrl: AppConfig.baseUrl,
      connectTimeout: AppConfig.requestTimeout,
      receiveTimeout: AppConfig.requestTimeout,
      contentType: 'application/json',
    ));

    final storage = sessionStorage ?? SessionStorage();

    _dio.interceptors.addAll([
      AuthInterceptor(storage, _dio),
      LogInterceptor(
        request: true,
        requestHeader: true,
        requestBody: true,
        responseHeader: true,
        responseBody: true,
        error: true,
      ),
    ]);
  }

  Dio get dio => _dio;
}
