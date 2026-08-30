class AppConfig {
  // Per backend spec: never decode JWT client-side — authorization is server-authoritative.
  // Login errors are intentionally generic per spec — do not branch on error subtype.

  static const String baseUrl = 'http://localhost:3000/api/v1';
  static const Duration requestTimeout = Duration(seconds: 15);

  // Auth & Identity Endpoints
  static const String loginEndpoint = '/auth/login';
  static const String mfaVerifyEndpoint = '/auth/mfa/verify';
  static const String refreshEndpoint = '/auth/refresh';
  static const String getMeEndpoint = '/auth/me';
  
  // Do not assume response shape; treat success purely based on HTTP status code (2xx).
  static const String logoutEndpoint = '/auth/logout';

  // TOTP MFA Endpoints
  static const String mfaEnrollEndpoint = '/auth/mfa/enroll';
  
  // Do not assume response shape; treat success purely based on HTTP status code (2xx).
  static const String mfaConfirmEndpoint = '/auth/mfa/enroll/confirm';
  
  // Do not assume response shape; treat success purely based on HTTP status code (2xx).
  static const String mfaDisableEndpoint = '/auth/mfa/disable';

  // Authorization & Connectivity
  static const String authzCheckEndpoint = '/authz/check';
  static const String authzPermissionsEndpoint = '/authz/permissions';
  
  // Do not assume response shape; treat success purely based on HTTP status code (2xx).
  static const String healthReadyEndpoint = '/health/ready';
}
