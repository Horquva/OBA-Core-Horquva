class AppException implements Exception {
  final String message;
  final String? code;

  const AppException(this.message, {this.code});

  @override
  String toString() => 'AppException: $message (code: $code)';
}

class NetworkException extends AppException {
  const NetworkException([super.message = 'Network error occurred'])
      : super(code: 'NETWORK_ERROR');
}

class ServerException extends AppException {
  const ServerException([super.message = 'Server error occurred'])
      : super(code: 'SERVER_ERROR');
}

class CacheException extends AppException {
  const CacheException([super.message = 'Cache error occurred'])
      : super(code: 'CACHE_ERROR');
}

class ValidationException extends AppException {
  const ValidationException([super.message = 'Validation error'])
      : super(code: 'VALIDATION_ERROR');
}

class UnauthorizedException extends AppException {
  const UnauthorizedException([super.message = 'Unauthorized access'])
      : super(code: 'UNAUTHORIZED');
}

class NotFoundException extends AppException {
  const NotFoundException([super.message = 'Resource not found'])
      : super(code: 'NOT_FOUND');
}
