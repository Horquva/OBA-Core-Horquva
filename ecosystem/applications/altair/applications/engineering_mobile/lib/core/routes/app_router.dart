import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/authentication/presentation/screens/login_screen.dart';
import '../../features/dashboard/presentation/screens/dashboard_screen.dart';
import '../../features/knowledge/presentation/screens/knowledge_screen.dart';
import '../../features/notifications/presentation/screens/notifications_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../features/projects/presentation/screens/projects_screen.dart';
import '../../features/settings/presentation/screens/settings_screen.dart';
import '../constants/app_dimensions.dart';
import '../constants/route_names.dart';

class AppRouter {
  AppRouter._();

  static final GoRouter router = GoRouter(
    initialLocation: '/login',
    routes: [
      GoRoute(
        path: '/login',
        name: RouteNames.login,
        builder: (context, state) => const LoginScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) => _ShellScreen(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            name: RouteNames.dashboard,
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/projects',
            name: RouteNames.projects,
            builder: (context, state) => const ProjectsScreen(),
          ),
          GoRoute(
            path: '/knowledge',
            name: RouteNames.knowledge,
            builder: (context, state) => const KnowledgeScreen(),
          ),
          GoRoute(
            path: '/notifications',
            name: RouteNames.notifications,
            builder: (context, state) => const NotificationsScreen(),
          ),
          GoRoute(
            path: '/profile',
            name: RouteNames.profile,
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/settings',
        name: RouteNames.settings,
        builder: (context, state) => const SettingsScreen(),
      ),
    ],
  );
}

class _ShellScreen extends StatefulWidget {
  final Widget child;

  const _ShellScreen({required this.child});

  @override
  State<_ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends State<_ShellScreen> {
  int _currentIndex = 0;

  final _navigationItems = const [
    (
      icon: Icons.dashboard_outlined,
      activeIcon: Icons.dashboard,
      label: 'Dashboard',
    ),
    (icon: Icons.folder_outlined, activeIcon: Icons.folder, label: 'Projects'),
    (
      icon: Icons.menu_book_outlined,
      activeIcon: Icons.menu_book,
      label: 'Knowledge',
    ),
    (
      icon: Icons.notifications_outlined,
      activeIcon: Icons.notifications,
      label: 'Alerts',
    ),
    (icon: Icons.person_outlined, activeIcon: Icons.person, label: 'Profile'),
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _updateIndex(GoRouterState.of(context).uri.toString());
  }

  @override
  void didUpdateWidget(covariant _ShellScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    _updateIndex(GoRouterState.of(context).uri.toString());
  }

  void _updateIndex(String location) {
    final index = switch (location) {
      '/dashboard' => 0,
      '/projects' => 1,
      '/knowledge' => 2,
      '/notifications' => 3,
      '/profile' => 4,
      _ => 0,
    };
    if (index != _currentIndex) {
      setState(() => _currentIndex = index);
    }
  }

  void _onDestinationSelected(int index) {
    setState(() => _currentIndex = index);
    final location = switch (index) {
      0 => '/dashboard',
      1 => '/projects',
      2 => '/knowledge',
      3 => '/notifications',
      4 => '/profile',
      _ => '/dashboard',
    };
    context.go(location);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(switch (_currentIndex) {
          0 => 'Dashboard',
          1 => 'Projects',
          2 => 'Knowledge',
          3 => 'Alerts',
          4 => 'Profile',
          _ => '',
        }),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => context.push('/settings'),
          ),
          const SizedBox(width: AppDimensions.sm),
        ],
      ),
      body: widget.child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: _onDestinationSelected,
        height: AppDimensions.bottomNavHeight,
        backgroundColor: theme.colorScheme.surface,
        indicatorColor: theme.colorScheme.primaryContainer.withValues(
          alpha: 0.3,
        ),
        destinations: _navigationItems
            .map(
              (item) => NavigationDestination(
                icon: Icon(item.icon),
                selectedIcon: Icon(item.activeIcon),
                label: item.label,
              ),
            )
            .toList(),
      ),
    );
  }
}
