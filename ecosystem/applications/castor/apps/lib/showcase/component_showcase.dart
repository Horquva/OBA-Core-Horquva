import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';
import '../views/widgets/action_button.dart';
import '../views/widgets/pill_button.dart';

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
