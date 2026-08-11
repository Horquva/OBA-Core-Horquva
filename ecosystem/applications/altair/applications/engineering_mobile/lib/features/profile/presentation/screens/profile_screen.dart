import 'package:flutter/material.dart';
import '../../../../core/constants/app_dimensions.dart';

import '../../../../shared/widgets/app_card.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppDimensions.md),
      child: Column(
        children: [
          const SizedBox(height: AppDimensions.lg),
          _buildProfileHeader(context),
          const SizedBox(height: AppDimensions.lg),
          _buildProfileInfo(context),
          const SizedBox(height: AppDimensions.lg),
          _buildSkillsSection(context),
          const SizedBox(height: AppDimensions.lg),
          _buildRecentActivity(context),
        ],
      ),
    );
  }

  Widget _buildProfileHeader(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        Container(
          width: AppDimensions.avatarLg + 16,
          height: AppDimensions.avatarLg + 16,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: [
                theme.colorScheme.primary,
                theme.colorScheme.primary.withValues(alpha: 0.7),
              ],
            ),
          ),
          child: Center(
            child: Text(
              'AJ',
              style: theme.textTheme.displaySmall?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(height: AppDimensions.md),
        Text('Alex Johnson', style: theme.textTheme.headlineSmall),
        const SizedBox(height: AppDimensions.xs),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
            borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
          ),
          child: Text(
            'Senior Software Engineer',
            style: theme.textTheme.labelMedium?.copyWith(
              color: theme.colorScheme.primary,
            ),
          ),
        ),
        const SizedBox(height: AppDimensions.sm),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.email_outlined, size: 14, color: theme.colorScheme.onSurface.withValues(alpha: 0.5)),
            const SizedBox(width: 6),
            Text('alex.johnson@horquva.com', style: theme.textTheme.bodySmall),
          ],
        ),
        const SizedBox(height: AppDimensions.xs),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.business_outlined, size: 14, color: theme.colorScheme.onSurface.withValues(alpha: 0.5)),
            const SizedBox(width: 6),
            Text('Engineering Department', style: theme.textTheme.bodySmall),
          ],
        ),
      ],
    );
  }

  Widget _buildProfileInfo(BuildContext context) {
    final theme = Theme.of(context);
    final infoItems = [
      {'label': 'Employee ID', 'value': 'EMP-2024-0842'},
      {'label': 'Location', 'value': 'San Francisco, CA'},
      {'label': 'Department', 'value': 'Platform Engineering'},
      {'label': 'Joined', 'value': 'March 2024'},
      {'label': 'Reports To', 'value': 'Dr. Sarah Chen'},
    ];

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Profile Information', style: theme.textTheme.titleMedium),
          const SizedBox(height: AppDimensions.md),
          ...infoItems.map((item) {
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: AppDimensions.sm),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(item['label'] as String, style: theme.textTheme.bodyMedium),
                  Text(
                    item['value'] as String,
                    style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildSkillsSection(BuildContext context) {
    final theme = Theme.of(context);
    final skills = [
      'Flutter', 'Dart', 'Kotlin', 'Swift', 'REST APIs',
      'Clean Architecture', 'CI/CD', 'Git', 'Firebase', 'Testing',
    ];

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Skills & Expertise', style: theme.textTheme.titleMedium),
          const SizedBox(height: AppDimensions.md),
          Wrap(
            spacing: AppDimensions.sm,
            runSpacing: AppDimensions.sm,
            children: skills.map((skill) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
                ),
                child: Text(
                  skill,
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: theme.colorScheme.primary,
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentActivity(BuildContext context) {
    final theme = Theme.of(context);
    final activities = [
      {'action': 'Completed 5 code reviews', 'time': 'Today'},
      {'action': 'Merged PR #142', 'time': 'Yesterday'},
      {'action': 'Attended Architecture Review', 'time': '2 days ago'},
      {'action': 'Updated team documentation', 'time': '3 days ago'},
    ];

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Recent Activity', style: theme.textTheme.titleMedium),
          const SizedBox(height: AppDimensions.md),
          ...activities.map((activity) {
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: AppDimensions.sm),
              child: Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: AppDimensions.sm),
                  Expanded(
                    child: Text(activity['action'] as String, style: theme.textTheme.bodyMedium),
                  ),
                  Text(activity['time'] as String, style: theme.textTheme.bodySmall),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}
