import 'package:flutter/material.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../shared/widgets/app_card.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppDimensions.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Notifications', style: theme.textTheme.headlineSmall),
              TextButton(
                onPressed: () {},
                child: const Text('Mark All Read'),
              ),
            ],
          ),
          const SizedBox(height: AppDimensions.sm),
          _buildTodaySection(context),
          const SizedBox(height: AppDimensions.lg),
          _buildYesterdaySection(context),
          const SizedBox(height: AppDimensions.lg),
          _buildEarlierSection(context),
        ],
      ),
    );
  }

  Widget _buildTodaySection(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Today', style: theme.textTheme.titleSmall?.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.5))),
        const SizedBox(height: AppDimensions.sm),
        AppCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: _todayNotifications.map((n) => _NotificationItem(notification: n, theme: theme)).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildYesterdaySection(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Yesterday', style: theme.textTheme.titleSmall?.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.5))),
        const SizedBox(height: AppDimensions.sm),
        AppCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: _yesterdayNotifications.map((n) => _NotificationItem(notification: n, theme: theme)).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildEarlierSection(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Earlier', style: theme.textTheme.titleSmall?.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.5))),
        const SizedBox(height: AppDimensions.sm),
        AppCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: _earlierNotifications.map((n) => _NotificationItem(notification: n, theme: theme)).toList(),
          ),
        ),
      ],
    );
  }
}

final _todayNotifications = [
  {
    'icon': Icons.check_circle,
    'title': 'PR #142 merged',
    'subtitle': 'Your pull request was approved and merged',
    'time': '5m ago',
    'color': const Color(0xFF4CAF50),
    'isUnread': true,
  },
  {
    'icon': Icons.person,
    'title': 'New team member',
    'subtitle': 'Alex Rivera joined the Mobile App project',
    'time': '1h ago',
    'color': const Color(0xFF2196F3),
    'isUnread': true,
  },
  {
    'icon': Icons.warning_amber,
    'title': 'Build warning',
    'subtitle': 'Pipeline #847 has 3 warnings',
    'time': '2h ago',
    'color': const Color(0xFFFFC107),
    'isUnread': false,
  },
  {
    'icon': Icons.comment,
    'title': 'New comment',
    'subtitle': 'Sarah commented on your code review',
    'time': '3h ago',
    'color': const Color(0xFF9C27B0),
    'isUnread': true,
  },
];

final _yesterdayNotifications = [
  {
    'icon': Icons.rocket_launch,
    'title': 'Deployment successful',
    'subtitle': 'Version 2.1.0 deployed to production',
    'time': '1d ago',
    'color': const Color(0xFF4CAF50),
    'isUnread': false,
  },
  {
    'icon': Icons.bug_report,
    'title': 'Bug reported',
    'subtitle': 'Critical bug #487 assigned to you',
    'time': '1d ago',
    'color': const Color(0xFFD32F2F),
    'isUnread': true,
  },
  {
    'icon': Icons.event,
    'title': 'Meeting reminder',
    'subtitle': 'Sprint planning tomorrow at 10 AM',
    'time': '1d ago',
    'color': const Color(0xFFFF6F00),
    'isUnread': false,
  },
];

final _earlierNotifications = [
  {
    'icon': Icons.task_alt,
    'title': 'Task completed',
    'subtitle': 'API documentation task marked as done',
    'time': '3d ago',
    'color': const Color(0xFF4CAF50),
    'isUnread': false,
  },
  {
    'icon': Icons.update,
    'title': 'System update',
    'subtitle': 'Platform maintenance scheduled for weekend',
    'time': '5d ago',
    'color': const Color(0xFF2196F3),
    'isUnread': false,
  },
  {
    'icon': Icons.celebration,
    'title': 'Milestone achieved',
    'subtitle': 'Mobile App project reached 50% completion',
    'time': '1w ago',
    'color': const Color(0xFFE91E63),
    'isUnread': false,
  },
];

class _NotificationItem extends StatelessWidget {
  final Map<String, dynamic> notification;
  final ThemeData theme;

  const _NotificationItem({required this.notification, required this.theme});

  @override
  Widget build(BuildContext context) {
    final isUnread = notification['isUnread'] as bool;
    final color = notification['color'] as Color;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppDimensions.md, vertical: AppDimensions.sm),
      decoration: BoxDecoration(
        color: isUnread ? color.withValues(alpha: 0.03) : null,
        border: Border(bottom: BorderSide(color: theme.dividerColor)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(AppDimensions.sm),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
            ),
            child: Icon(notification['icon'] as IconData, color: color, size: 20),
          ),
          const SizedBox(width: AppDimensions.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        notification['title'] as String,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: isUnread ? FontWeight.w600 : FontWeight.w400,
                        ),
                      ),
                    ),
                    if (isUnread)
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: color,
                          shape: BoxShape.circle,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  notification['subtitle'] as String,
                  style: theme.textTheme.bodySmall,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  notification['time'] as String,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
