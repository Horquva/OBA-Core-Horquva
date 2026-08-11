import 'package:flutter/material.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../shared/widgets/app_card.dart';
import '../../../../shared/widgets/section_title.dart';

class KnowledgeScreen extends StatelessWidget {
  const KnowledgeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppDimensions.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Knowledge Portal', style: theme.textTheme.headlineSmall),
          const SizedBox(height: AppDimensions.sm),
          Text(
            'Documentation, guides, and standards',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(height: AppDimensions.lg),
          _buildCategories(context),
          const SizedBox(height: AppDimensions.lg),
          _buildRecentDocuments(context),
          const SizedBox(height: AppDimensions.lg),
          _buildQuickLinks(context),
        ],
      ),
    );
  }

  Widget _buildCategories(BuildContext context) {
    final theme = Theme.of(context);
    final categories = [
      {'icon': Icons.description_outlined, 'title': 'Documentation', 'count': '24 articles', 'color': const Color(0xFF1A237E)},
      {'icon': Icons.account_tree_outlined, 'title': 'Architecture', 'count': '12 articles', 'color': const Color(0xFF00897B)},
      {'icon': Icons.menu_book_outlined, 'title': 'Playbooks', 'count': '8 articles', 'color': const Color(0xFFE91E63)},
      {'icon': Icons.rule_outlined, 'title': 'Standards', 'count': '16 articles', 'color': const Color(0xFFFF6F00)},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle(title: 'Categories'),
        Row(
          children: categories.map((cat) {
            return Expanded(
              child: _CategoryCard(category: cat, theme: theme),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildRecentDocuments(BuildContext context) {
    final theme = Theme.of(context);
    final documents = [
      {'title': 'Flutter Architecture Guide v2', 'updated': '2 hours ago', 'type': 'Architecture'},
      {'title': 'API Integration Standards', 'updated': '1 day ago', 'type': 'Standards'},
      {'title': 'Deployment Playbook', 'updated': '3 days ago', 'type': 'Playbooks'},
      {'title': 'Code Review Checklist', 'updated': '5 days ago', 'type': 'Documentation'},
      {'title': 'Security Best Practices', 'updated': '1 week ago', 'type': 'Standards'},
      {'title': 'Onboarding Guide', 'updated': '2 weeks ago', 'type': 'Playbooks'},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle(
          title: 'Recent Documents',
          trailing: TextButton(
            onPressed: () {},
            child: const Text('Browse All'),
          ),
        ),
        AppCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: documents.map((doc) {
              return _DocumentItem(document: doc, theme: theme);
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildQuickLinks(BuildContext context) {
    final theme = Theme.of(context);
    final links = [
      {'title': 'Engineering Wiki', 'url': 'wiki.engineering.internal'},
      {'title': 'API Reference', 'url': 'api-docs.internal/v2'},
      {'title': 'Runbooks', 'url': 'runbooks.engineering.internal'},
      {'title': 'Architecture Decisions', 'url': 'adrs.engineering.internal'},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle(title: 'Quick Links'),
        AppCard(
          child: Column(
            children: links.map((link) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: AppDimensions.sm),
                child: Row(
                  children: [
                    Icon(Icons.link, size: 16, color: theme.colorScheme.primary),
                    const SizedBox(width: AppDimensions.sm),
                    Expanded(
                      child: Text(link['title'] as String, style: theme.textTheme.bodyMedium),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(AppDimensions.radiusXs),
                      ),
                      child: Text(
                        link['url'] as String,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

class _CategoryCard extends StatelessWidget {
  final Map<String, dynamic> category;
  final ThemeData theme;

  const _CategoryCard({required this.category, required this.theme});

  @override
  Widget build(BuildContext context) {
    final color = category['color'] as Color;
    return AppCard(
      onTap: () {},
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(AppDimensions.sm),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
            ),
            child: Icon(category['icon'] as IconData, color: color, size: 24),
          ),
          const SizedBox(height: AppDimensions.sm),
          Text(category['title'] as String, style: theme.textTheme.labelMedium, textAlign: TextAlign.center),
          const SizedBox(height: 2),
          Text(category['count'] as String, style: theme.textTheme.bodySmall, textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

class _DocumentItem extends StatelessWidget {
  final Map<String, dynamic> document;
  final ThemeData theme;

  const _DocumentItem({required this.document, required this.theme});

  Color _typeColor(String type) {
    return switch (type) {
      'Architecture' => const Color(0xFF00897B),
      'Standards' => const Color(0xFFFF6F00),
      'Playbooks' => const Color(0xFFE91E63),
      'Documentation' => const Color(0xFF1A237E),
      _ => const Color(0xFF9E9E9E),
    };
  }

  @override
  Widget build(BuildContext context) {
    final type = document['type'] as String;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppDimensions.md, vertical: AppDimensions.sm),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: theme.dividerColor)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(AppDimensions.sm),
            decoration: BoxDecoration(
              color: _typeColor(type).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
            ),
            child: Icon(Icons.article_outlined, color: _typeColor(type), size: 20),
          ),
          const SizedBox(width: AppDimensions.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(document['title'] as String, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500)),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: _typeColor(type).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(type, style: theme.textTheme.labelSmall?.copyWith(color: _typeColor(type))),
                    ),
                    const SizedBox(width: AppDimensions.sm),
                    Text(document['updated'] as String, style: theme.textTheme.bodySmall),
                  ],
                ),
              ],
            ),
          ),
          Icon(Icons.chevron_right, color: theme.colorScheme.onSurface.withValues(alpha: 0.3)),
        ],
      ),
    );
  }
}
