import 'package:flutter/material.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../shared/widgets/app_card.dart';


class ProjectsScreen extends StatelessWidget {
  const ProjectsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppDimensions.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Engineering Projects', style: theme.textTheme.headlineSmall),
          const SizedBox(height: AppDimensions.sm),
          Text(
            '${_projects.length} active projects',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(height: AppDimensions.lg),
          ...List.generate(_projects.length, (index) {
            final project = _projects[index];
            return Padding(
              padding: const EdgeInsets.only(bottom: AppDimensions.md),
              child: _ProjectCard(project: project, theme: theme),
            );
          }),
        ],
      ),
    );
  }
}

const _projects = [
  {
    'name': 'Mobile App Platform',
    'status': 'In Progress',
    'progress': 0.65,
    'owner': 'Sarah Chen',
    'dueDate': 'Aug 15, 2026',
    'description': 'Building the next-gen mobile engineering platform',
    'team': 6,
    'tasks': 24,
  },
  {
    'name': 'API Gateway',
    'status': 'Review',
    'progress': 0.90,
    'owner': 'Mike Johnson',
    'dueDate': 'Jul 30, 2026',
    'description': 'Centralized API gateway with rate limiting',
    'team': 4,
    'tasks': 18,
  },
  {
    'name': 'Design System',
    'status': 'Completed',
    'progress': 1.0,
    'owner': 'Emily Davis',
    'dueDate': 'Jul 15, 2026',
    'description': 'Unified component library and design tokens',
    'team': 3,
    'tasks': 42,
  },
  {
    'name': 'CI/CD Pipeline',
    'status': 'Planning',
    'progress': 0.15,
    'owner': 'Alex Kim',
    'dueDate': 'Sep 01, 2026',
    'description': 'Automated build and deployment pipeline',
    'team': 5,
    'tasks': 15,
  },
  {
    'name': 'Monitoring Dashboard',
    'status': 'In Progress',
    'progress': 0.45,
    'owner': 'Lisa Wang',
    'dueDate': 'Aug 30, 2026',
    'description': 'Real-time system monitoring and alerts',
    'team': 3,
    'tasks': 20,
  },
  {
    'name': 'Documentation Portal',
    'status': 'In Progress',
    'progress': 0.35,
    'owner': 'James Wilson',
    'dueDate': 'Sep 15, 2026',
    'description': 'Centralized technical documentation hub',
    'team': 2,
    'tasks': 12,
  },
];

class _ProjectCard extends StatelessWidget {
  final Map<String, dynamic> project;
  final ThemeData theme;

  const _ProjectCard({required this.project, required this.theme});

  Color _statusColor(String status) {
    return switch (status) {
      'In Progress' => const Color(0xFF2196F3),
      'Review' => const Color(0xFFFFC107),
      'Completed' => const Color(0xFF4CAF50),
      'Planning' => const Color(0xFF9E9E9E),
      _ => const Color(0xFF9E9E9E),
    };
  }

  @override
  Widget build(BuildContext context) {
    final status = project['status'] as String;
    final color = _statusColor(status);

    return AppCard(
      onTap: () {},
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  project['name'] as String,
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
                ),
                child: Text(
                  status,
                  style: theme.textTheme.labelSmall?.copyWith(color: color, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppDimensions.sm),
          Text(
            project['description'] as String,
            style: theme.textTheme.bodySmall,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: AppDimensions.md),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: project['progress'] as double,
              minHeight: 6,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
          const SizedBox(height: AppDimensions.sm),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${((project['progress'] as double) * 100).toInt()}% complete',
                style: theme.textTheme.bodySmall?.copyWith(color: color),
              ),
              Row(
                children: [
                  Icon(Icons.people_outline, size: 14, color: theme.colorScheme.onSurface.withValues(alpha: 0.5)),
                  const SizedBox(width: 4),
                  Text(
                    '${project['team']}',
                    style: theme.textTheme.bodySmall,
                  ),
                  const SizedBox(width: AppDimensions.md),
                  Icon(Icons.checklist, size: 14, color: theme.colorScheme.onSurface.withValues(alpha: 0.5)),
                  const SizedBox(width: 4),
                  Text(
                    '${project['tasks']}',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: AppDimensions.sm),
          const Divider(),
          const SizedBox(height: AppDimensions.sm),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.person_outline, size: 14, color: theme.colorScheme.onSurface.withValues(alpha: 0.5)),
                  const SizedBox(width: 4),
                  Text(project['owner'] as String, style: theme.textTheme.bodySmall),
                ],
              ),
              Row(
                children: [
                  Icon(Icons.calendar_today, size: 14, color: theme.colorScheme.onSurface.withValues(alpha: 0.5)),
                  const SizedBox(width: 4),
                  Text(project['dueDate'] as String, style: theme.textTheme.bodySmall),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
