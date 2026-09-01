/// Sentinel Navigation — Route Name Constants
/// Owner: Muhammad Anas (Experience Layer)
///
/// All navigation must use these constants — never hardcode path strings.
/// eventDetail / findingDetail paths use ':id' pattern for GoRouter params.
abstract class SentinelRoutes {
  static const String dashboard      = '/dashboard';
  static const String identity       = '/identity';
  static const String appsec         = '/appsec';
  static const String infrastructure = '/infrastructure';
  static const String aiSecurity     = '/ai-security';
  static const String devsecops      = '/devsecops';
  static const String events         = '/events';
  static const String eventDetail    = '/events/:eventId';
  static const String securityEvents = '/security-events';

  static const String more           = '/more'; // Legacy, will point to overview or settings
  static const String settings       = '/settings';
  static const String overview       = '/overview';
  static const String incidents      = '/incidents';
}
