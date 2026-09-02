import 'package:go_router/go_router.dart';
import '../navigation/route_names.dart';
import '../navigation/sentinel_shell.dart';
import '../../command_dashboard/command_dashboard_screen.dart';
import '../../dashboard/dashboard_screen.dart';
import '../../identity/identity_screen.dart';
import '../../appsec/appsec_screen.dart';
import '../../infrastructure/infrastructure_screen.dart';
import '../../ai_security/ai_security_screen.dart';
import '../../devsecops/devsecops_screen.dart';
import '../../incidents/incidents_screen.dart';
import '../../investigate_hub/investigate_hub_screen.dart';
import '../../security_events/security_events_screen.dart';
import '../../settings/settings_screen.dart';

/// Sentinel GoRouter Configuration
/// Owner: Muhammad Anas (Experience Layer) — UX navigation structure
///
/// NOTE TO M.ALI: The Team Lead rule states GoRouter technical setup lives in
/// `core/routing/app_router.dart`. Please move this file there and update
/// imports in main.dart accordingly. Anas will keep the route structure
/// aligned — M.Ali controls where it lives in the project.
///
/// Auth redirect guards must be added by M.Ali inside his core/routing layer.
/// Anas does NOT add any token/session checks here.
final sentinelRouter = GoRouter(
  initialLocation: SentinelRoutes.dashboard,
  debugLogDiagnostics: true, // remove in production
  routes: [
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) => SentinelShell(navigationShell: navigationShell),
      branches: [
        // Branch 0: Command (Dashboard & Domains)
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: SentinelRoutes.dashboard,
              pageBuilder: (context, state) => const NoTransitionPage(child: CommandDashboardScreen()),
            ),
            GoRoute(
              path: SentinelRoutes.identity,
              pageBuilder: (context, state) => const NoTransitionPage(child: IdentityScreen()),
            ),
            GoRoute(
              path: SentinelRoutes.appsec,
              pageBuilder: (context, state) => const NoTransitionPage(child: AppsecScreen()),
            ),
            GoRoute(
              path: SentinelRoutes.infrastructure,
              pageBuilder: (context, state) => const NoTransitionPage(child: InfrastructureScreen()),
            ),
            GoRoute(
              path: SentinelRoutes.aiSecurity,
              pageBuilder: (context, state) => const NoTransitionPage(child: AiSecurityScreen()),
            ),
            GoRoute(
              path: SentinelRoutes.devsecops,
              pageBuilder: (context, state) => const NoTransitionPage(child: DevsecopsScreen()),
            ),
          ],
        ),

        // Branch 1: Investigate (Events)
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: SentinelRoutes.events,
              pageBuilder: (context, state) => const NoTransitionPage(child: InvestigateHubScreen()),
              routes: [
                GoRoute(
                  path: ':eventId',
                  builder: (context, state) => EventDetailScreen(
                    eventId: state.pathParameters['eventId']!,
                  ),
                ),
              ],
            ),
          ],
        ),

        // Branch 2: Center FAB (Overview)
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: SentinelRoutes.overview,
              pageBuilder: (context, state) => const NoTransitionPage(child: DashboardScreen()),
            ),
            GoRoute(
              path: SentinelRoutes.securityEvents,
              pageBuilder: (context, state) => const NoTransitionPage(child: SecurityEventsScreen()),
            ),
            // Legacy more route maps here too
            GoRoute(
              path: SentinelRoutes.more,
              pageBuilder: (context, state) => const NoTransitionPage(child: DashboardScreen()),
            ),
          ],
        ),

        // Branch 3: Incidents
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: SentinelRoutes.incidents,
              pageBuilder: (context, state) => const NoTransitionPage(child: IncidentsScreen()),
            ),
          ],
        ),

        // Branch 4: More (Settings)
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: SentinelRoutes.settings,
              pageBuilder: (context, state) => const NoTransitionPage(child: SettingsScreen()),
            ),
          ],
        ),
      ],
    ),
  ],
);
