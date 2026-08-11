import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';
import '../views/widgets/action_button.dart';
import '../views/widgets/pill_button.dart';
import '../views/widgets/severity_badge.dart';
import '../views/widgets/status_pill.dart';
import '../views/widgets/tag_chip.dart';

/// A simple gallery screen that displays every reusable component in one place.
///
/// This is only used during development (Part C) to see and test the components.
/// It is NOT part of the real app flow — the real screens come later.
class ComponentShowcase extends StatelessWidget {
  const ComponentShowcase({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Component Showcase')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          // ─── Pill Button (Type 1) ──────────────────────────────────────
          _section(
            title: 'Pill Button',
            children: [
              PillButton(
                label: 'Review & Take Action',
                icon: Icons.arrow_forward,
                onPressed: () {},
              ),
              const SizedBox(height: AppSpacing.md),
              PillButton(
                label: 'Start Briefing',
                onPressed: () {},
              ),
              const SizedBox(height: AppSpacing.md),
              PillButton(
                label: 'Summary',
                variant: PillButtonVariant.secondary,
                onPressed: () {},
              ),
              const SizedBox(height: AppSpacing.md),
              // Colours passed through the constructor (override the variant).
              PillButton(
                label: 'Custom Colour',
                backgroundColor: AppColors.accent,
                textColor: AppColors.onAccent,
                onPressed: () {},
              ),
              const SizedBox(height: AppSpacing.md),
              const PillButton(
                label: 'Disabled',
                onPressed: null,
              ),
            ],
          ),

          // ─── Action Button (Type 2) ────────────────────────────────────
          _section(
            title: 'Action Button',
            children: [
              ActionButton(
                icon: Icons.play_arrow,
                title: 'Start Briefing',
                subtitle: '8 min estimated',
                onPressed: () {},
              ),
              const SizedBox(height: AppSpacing.md),
              // Same button placed on a dark green background via overrides.
              ActionButton(
                icon: Icons.play_arrow,
                title: 'Start Briefing',
                subtitle: '8 min estimated',
                backgroundColor: AppColors.primary,
                textColor: AppColors.onPrimary,
                onPressed: () {},
              ),
            ],
          ),

          // ─── Severity Badge ────────────────────────────────────────────
          _section(
            title: 'Severity Badge',
            children: const [
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  SeverityBadge(severity: Severity.critical),
                  SeverityBadge(severity: Severity.important),
                  SeverityBadge(severity: Severity.informational),
                  // Custom label while keeping a severity colour.
                  SeverityBadge(severity: Severity.critical, label: 'URGENT'),
                ],
              ),
            ],
          ),

          // ─── Tag Chip ──────────────────────────────────────────────────
          _section(
            title: 'Tag Chip',
            children: [
              const Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  TagChip(label: 'Operations'),
                  TagChip(label: 'Risk'),
                  TagChip(label: 'Finance'),
                  TagChip(label: 'Security'),
                  // Tinted chip: green text on very light green.
                  TagChip(label: 'People', color: AppColors.informational),
                ],
              ),
            ],
          ),

          // ─── Status Pill ───────────────────────────────────────────────
          _section(
            title: 'Status Pill',
            children: [
              StatusPill(
                label: 'All Systems Operational',
                showChevron: true,
                onTap: () {},
              ),
              const SizedBox(height: AppSpacing.md),
              // Different status colour (amber = attention needed).
              const StatusPill(
                label: 'Attention Needed',
                dotColor: AppColors.important,
              ),
              const SizedBox(height: AppSpacing.md),
              // Icon instead of a dot (e.g. the "Last updated" pill).
              StatusPill(
                label: 'Last updated: 08:42 AM',
                icon: Icons.power_settings_new,
                onTap: () {},
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Small helper that shows a section title followed by its components.
  Widget _section({required String title, required List<Widget> children}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: AppTypography.titleMedium),
        const SizedBox(height: AppSpacing.md),
        ...children,
        const SizedBox(height: AppSpacing.xxl),
      ],
    );
  }
}
