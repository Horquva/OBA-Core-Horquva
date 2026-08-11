import 'package:flutter/material.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../shared/widgets/app_card.dart';
import '../../../../shared/widgets/section_title.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppDimensions.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Welcome back, Alex', style: theme.textTheme.headlineSmall),
          const SizedBox(height: AppDimensions.sm),
          Text(
            'Here\'s your engineering overview',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(height: AppDimensions.lg),
          _buildStatsRow(context),
          const SizedBox(height: AppDimensions.lg),
          _buildTodayTasks(context),
          const SizedBox(height: AppDimensions.lg),
          _buildQuickActions(context),
          const SizedBox(height: AppDimensions.lg),
          _buildRecentActivity(context),
          const SizedBox(height: AppDimensions.lg),
          _buildPlatformStatus(context),
        ],
      ),
    );
  }

  Widget _buildStatsRow(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            icon: Icons.assignment_outlined,
            value: '24',
            label: 'Active Tasks',
            color: theme.colorScheme.primary,
          ),
        ),
        const SizedBox(width: AppDimensions.sm),
        Expanded(
          child: _StatCard(
            icon: Icons.folder_outlined,
            value: '12',
            label: 'Projects',
            color: theme.colorScheme.secondary,
          ),
        ),
        const SizedBox(width: AppDimensions.sm),
        Expanded(
          child: _StatCard(
            icon: Icons.people_outline,
            value: '8',
            label: 'Team Members',
            color: const Color(0xFFE91E63),
          ),
        ),
        const SizedBox(width: AppDimensions.sm),
        Expanded(
          child: _StatCard(
            icon: Icons.notifications_outlined,
            value: '5',
            label: 'Alerts',
            color: const Color(0xFFFF6F00),
          ),
        ),
      ],
    );
  }

  Widget _buildTodayTasks(BuildContext context) {
    final theme = Theme.of(context);
    final tasks = [
      {'title': 'Review PR #142', 'status': 'In Progress', 'priority': 'High'},
      {'title': 'Update API documentation', 'status': 'Pending', 'priority': 'Medium'},
      {'title': 'Fix navigation bug', 'status': 'Completed', 'priority': 'High'},
      {'title': 'Sprint planning meeting', 'status': 'Upcoming', 'priority': 'Low'},
      {'title': 'Code review session', 'status': 'Pending', 'priority': 'Medium'},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle(
          title: "Today's Tasks",
          subtitle: '${tasks.length} tasks for today',
          trailing: TextButton(
            onPressed: () {},
            child: const Text('View All'),
          ),
        ),
        AppCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: tasks.map((task) => _TaskItem(task: task, theme: theme)).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    final actions = [
      {'icon': Icons.add_circle_outline, 'label': 'New Project', 'color': const Color(0xFF1A237E)},
      {'icon': Icons.person_add_outlined, 'label': 'Invite Member', 'color': const Color(0xFF00897B)},
      {'icon': Icons.document_scanner_outlined, 'label': 'New Document', 'color': const Color(0xFFE91E63)},
      {'icon': Icons.more_horiz, 'label': 'More', 'color': const Color(0xFF6C757D)},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle(title: 'Quick Actions'),
        Row(
          children: actions.map((action) {
            return Expanded(
              child: _ActionItem(action: action),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildRecentActivity(BuildContext context) {
    final theme = Theme.of(context);
    final activities = [
      {'user': 'Sarah Chen', 'action': 'merged PR #142', 'time': '5m ago'},
      {'user': 'Mike Johnson', 'action': 'created project "Mobile App"', 'time': '1h ago'},
      {'user': 'Emily Davis', 'action': 'commented on your PR', 'time': '2h ago'},
      {'user': 'Alex Kim', 'action': 'deployed v2.1.0', 'time': '3h ago'},
      {'user': 'Lisa Wang', 'action': 'updated API spec', 'time': '5h ago'},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle(
          title: 'Recent Activity',
          trailing: TextButton(
            onPressed: () {},
            child: const Text('View All'),
          ),
        ),
        AppCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: activities.map((activity) {
              return ListTile(
                dense: true,
                leading: CircleAvatar(
                  radius: 18,
                  backgroundColor: theme.colorScheme.primaryContainer,
                  child: Text(
                    activity['user']![0],
                    style: TextStyle(
                      color: theme.colorScheme.onPrimaryContainer,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                title: RichText(
                  text: TextSpan(
                    style: theme.textTheme.bodyMedium,
                    children: [
                      TextSpan(
                        text: '${activity['user']} ',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      TextSpan(text: activity['action']),
                    ],
                  ),
                ),
                subtitle: Text(activity['time']!, style: theme.textTheme.bodySmall),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildPlatformStatus(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle(title: 'Platform Status'),
        AppCard(
          child: Column(
            children: [
              _StatusRow(
                label: 'API Services',
                status: 'Operational',
                statusColor: const Color(0xFF4CAF50),
                theme: theme,
              ),
              const SizedBox(height: AppDimensions.sm),
              _StatusRow(
                label: 'Database',
                status: 'Operational',
                statusColor: const Color(0xFF4CAF50),
                theme: theme,
              ),
              const SizedBox(height: AppDimensions.sm),
              _StatusRow(
                label: 'Authentication',
                status: 'Degraded',
                statusColor: const Color(0xFFFFC107),
                theme: theme,
              ),
              const SizedBox(height: AppDimensions.sm),
              _StatusRow(
                label: 'CI/CD Pipeline',
                status: 'Operational',
                statusColor: const Color(0xFF4CAF50),
                theme: theme,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(AppDimensions.sm),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: AppDimensions.sm),
          Text(value, style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 2),
          Text(label, style: theme.textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _TaskItem extends StatelessWidget {
  final Map<String, String> task;
  final ThemeData theme;

  const _TaskItem({required this.task, required this.theme});

  Color _statusColor(String status) {
    return switch (status) {
      'Completed' => const Color(0xFF4CAF50),
      'In Progress' => const Color(0xFF2196F3),
      'Pending' => const Color(0xFFFFC107),
      'Upcoming' => const Color(0xFF9E9E9E),
      _ => const Color(0xFF9E9E9E),
    };
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppDimensions.md, vertical: AppDimensions.sm),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: theme.dividerColor)),
      ),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 40,
            decoration: BoxDecoration(
              color: _statusColor(task['priority'] ?? ''),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: AppDimensions.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(task['title'] ?? '', style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500)),
                const SizedBox(height: 4),
                Text(task['status'] ?? '', style: theme.textTheme.bodySmall),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: _statusColor(task['status'] ?? '').withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppDimensions.radiusXs),
            ),
            child: Text(
              task['priority'] ?? '',
              style: theme.textTheme.labelSmall?.copyWith(
                color: _statusColor(task['status'] ?? ''),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionItem extends StatelessWidget {
  final Map<String, dynamic> action;

  const _ActionItem({required this.action});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AppCard(
      onTap: () {},
      child: Column(
        children: [
          Icon(action['icon'] as IconData, color: action['color'] as Color, size: 28),
          const SizedBox(height: AppDimensions.sm),
          Text(action['label'] as String, style: theme.textTheme.labelMedium),
        ],
      ),
    );
  }
}

class _StatusRow extends StatelessWidget {
  final String label;
  final String status;
  final Color statusColor;
  final ThemeData theme;

  const _StatusRow({
    required this.label,
    required this.status,
    required this.statusColor,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: theme.textTheme.bodyMedium),
        Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: statusColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: AppDimensions.sm),
            Text(status, style: theme.textTheme.bodySmall?.copyWith(color: statusColor)),
          ],
        ),
      ],
    );
  }
}
