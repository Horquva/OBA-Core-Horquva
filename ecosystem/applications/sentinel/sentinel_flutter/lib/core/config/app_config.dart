class AppConfig {
  static const String baseUrl = 'http://localhost:3000/api/v1';
  static const Duration requestTimeout = Duration(seconds: 15);

  // Auth & Identity Endpoints
  static const String loginEndpoint = '/auth/login';
  static const String mfaVerifyEndpoint = '/auth/mfa/verify';
  static const String refreshEndpoint = '/auth/refresh';
  static const String getMeEndpoint = '/auth/me';
  static const String logoutEndpoint = '/auth/logout';

  // TOTP MFA Endpoints
  static const String mfaEnrollEndpoint = '/auth/mfa/enroll';
  static const String mfaConfirmEndpoint = '/auth/mfa/enroll/confirm';
  static const String mfaDisableEndpoint = '/auth/mfa/disable';

  // Authorization & Connectivity
  static const String authzCheckEndpoint = '/authz/check';
  static const String authzPermissionsEndpoint = '/authz/permissions';
  static const String healthReadyEndpoint = '/health/ready';
}
