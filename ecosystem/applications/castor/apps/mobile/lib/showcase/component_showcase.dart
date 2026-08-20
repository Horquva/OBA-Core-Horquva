import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_icons.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';
import '../views/widgets/action_button.dart';
import '../views/widgets/app_text_field.dart';
import '../views/widgets/app_top_bar.dart';
import '../views/widgets/bottom_nav_bar.dart';
import '../views/widgets/briefing_card.dart';
import '../views/widgets/decision_card.dart';
import '../views/widgets/pill_button.dart';
import '../views/widgets/segmented_tabs.dart';
import '../views/widgets/severity_badge.dart';
import '../views/widgets/signal_card.dart';
import '../views/widgets/stat_item.dart';
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
                icon: AppIcons.send,
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
                icon: AppIcons.play,
                title: 'Start Briefing',
                subtitle: '8 min estimated',
                onPressed: () {},
              ),
              const SizedBox(height: AppSpacing.md),
              // Same button placed on a dark green background via overrides.
              ActionButton(
                icon: AppIcons.play,
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
                icon: AppIcons.lastUpdated,
                onTap: () {},
              ),
            ],
          ),

          // ─── Stat Item ─────────────────────────────────────────────────
          _section(
            title: 'Stat Item',
            children: [
              // Three stats side by side, like the Overview header.
              // Expanded splits the row evenly so long labels can wrap.
              const Row(
                children: [
                  Expanded(
                    child: StatItem(
                      icon: AppIcons.signals,
                      value: '12,481',
                      label: 'Signals analyzed',
                    ),
                  ),
                  Expanded(
                    child: StatItem(
                      icon: AppIcons.sparkle,
                      value: '7',
                      label: 'Material changes',
                    ),
                  ),
                  Expanded(
                    child: StatItem(
                      icon: AppIcons.attention,
                      value: '2',
                      label: 'Require attention',
                    ),
                  ),
                ],
              ),
            ],
          ),

          // ─── Signal Card ───────────────────────────────────────────────
          _section(
            title: 'Signal Card',
            children: [
              SignalCard(
                icon: AppIcons.critical,
                severity: Severity.critical,
                time: '08:12 AM',
                title: 'Vendor dependency risk increased',
                description:
                    'A key vendor experienced a service disruption impacting '
                    '3 dependent systems.',
                tags: const ['Operations', 'Risk'],
                onTap: () {},
              ),
              const SizedBox(height: AppSpacing.md),
              SignalCard(
                icon: AppIcons.important,
                severity: Severity.important,
                time: '07:45 AM',
                title: 'Q2 revenue forecast updated',
                description:
                    'Finance team updated the forecast. Impact expected on '
                    'regional allocations.',
                tags: const ['Finance', 'Planning'],
                onTap: () {},
              ),
              const SizedBox(height: AppSpacing.md),
              SignalCard(
                icon: AppIcons.important,
                severity: Severity.important,
                time: '07:30 AM',
                title: 'Cybersecurity threat detected',
                description: 'Suspicious login attempts detected from unusual '
                    'geographic locations.',
                tags: const ['Security', 'Threat'],
                onTap: () {},
              ),
              const SizedBox(height: AppSpacing.md),
              SignalCard(
                icon: AppIcons.informational,
                severity: Severity.informational,
                time: '06:50 AM',
                title: 'Employee sentiment improved',
                description:
                    'Monthly sentiment score increased by 6% across the '
                    'organization.',
                tags: const ['People'],
                onTap: () {},
              ),
            ],
          ),

          // ─── Decision Card ─────────────────────────────────────────────
          _section(
            title: 'Decision Card',
            children: [
              DecisionCard(
                icon: AppIcons.urgent,
                severity: Severity.critical,
                priorityLabel: 'URGENT',
                number: 1,
                title: 'Approve Q3 Investment Plan',
                meta: 'High impact • Requires your decision',
                due: 'Due: Today, 02:00 PM',
                onTap: () {},
              ),
              const SizedBox(height: AppSpacing.md),
              DecisionCard(
                icon: AppIcons.highPriority,
                severity: Severity.important,
                priorityLabel: 'HIGH PRIORITY',
                number: 2,
                title: 'Vendor Risk Assessment',
                meta: 'High impact • Requires your review',
                due: 'Due: Tomorrow, 11:00 AM',
                onTap: () {},
              ),
              const SizedBox(height: AppSpacing.md),
              DecisionCard(
                icon: AppIcons.highPriority,
                severity: Severity.important,
                priorityLabel: 'HIGH PRIORITY',
                number: 3,
                title: 'Policy Exception Request',
                meta: 'Medium impact • Requires approval',
                due: 'Due: Tomorrow, 04:00 PM',
                onTap: () {},
              ),
              const SizedBox(height: AppSpacing.md),
              DecisionCard(
                icon: AppIcons.medium,
                severity: Severity.informational,
                priorityLabel: 'MEDIUM',
                number: 4,
                title: 'Marketing Budget Reallocation',
                meta: 'Medium impact • For approval',
                due: 'Due: May 18, 10:00 AM',
                onTap: () {},
              ),
              const SizedBox(height: AppSpacing.md),
              DecisionCard(
                icon: AppIcons.medium,
                severity: Severity.informational,
                priorityLabel: 'MEDIUM',
                number: 5,
                title: 'New Hiring Request',
                meta: 'Low impact • For approval',
                due: 'Due: May 19, 09:00 AM',
                onTap: () {},
              ),
            ],
          ),

          // ─── Text Field ────────────────────────────────────────────────
          _section(
            title: 'Text Field',
            children: const [
              // "Ask" type — mic icon at the end.
              AppTextField(
                hintText: 'Ask anything about your organization...',
                type: AppTextFieldType.ask,
              ),
              SizedBox(height: AppSpacing.md),
              // "Search" type — search icon at the end.
              AppTextField(
                hintText: 'Search signals...',
                type: AppTextFieldType.search,
              ),
            ],
          ),

          // ─── Briefing Card ─────────────────────────────────────────────
          _section(
            title: 'Briefing Card',
            children: [
              BriefingCard(
                label: 'EXECUTIVE BRIEFING',
                title: "Here's what matters most.",
                body: 'I analyzed 12,481 signals and identified '
                    '7 material changes.',
                startTitle: 'Start Briefing',
                startSubtitle: '8 min estimated',
                summaryTitle: 'Summary',
                summarySubtitle: 'Key highlights',
                estimateValue: '72s',
                estimateLabel: 'estimated',
                onStart: () {},
                onSummary: () {},
              ),
            ],
          ),

          // ─── App Top Bar ───────────────────────────────────────────────
          _section(
            title: 'App Top Bar',
            children: [
              // Detail bar with a subtitle and a filter action.
              AppTopBar(
                title: 'Signals',
                subtitle: 'All critical and important signals',
                onBack: () {},
                actionIcon: AppIcons.signalsFilter,
                onAction: () {},
              ),
              const SizedBox(height: AppSpacing.md),
              // Detail bar without a subtitle, with a share action.
              AppTopBar(
                title: 'Signal Detail',
                onBack: () {},
                actionIcon: AppIcons.signalDetailShare,
                onAction: () {},
              ),
            ],
          ),

          // ─── Segmented Tabs ────────────────────────────────────────────
          _section(
            title: 'Segmented Tabs',
            children: const [_TabsDemo()],
          ),

          // ─── Bottom Nav Bar ────────────────────────────────────────────
          _section(
            title: 'Bottom Nav Bar',
            children: const [_BottomNavDemo()],
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

/// A small stateful demo so the bottom nav bar reacts to taps in the showcase.
class _BottomNavDemo extends StatefulWidget {
  const _BottomNavDemo();

  @override
  State<_BottomNavDemo> createState() => _BottomNavDemoState();
}

class _BottomNavDemoState extends State<_BottomNavDemo> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return BottomNavBar(
      currentIndex: _index,
      onTap: (i) => setState(() => _index = i),
      onCastorTap: () {},
    );
  }
}

/// A small stateful demo so the segmented tabs react to taps in the showcase.
class _TabsDemo extends StatefulWidget {
  const _TabsDemo();

  @override
  State<_TabsDemo> createState() => _TabsDemoState();
}

class _TabsDemoState extends State<_TabsDemo> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return SegmentedTabs(
      currentIndex: _index,
      onTap: (i) => setState(() => _index = i),
      tabs: const [
        SegmentTab('All Signals'),
        SegmentTab('Critical', count: 2),
        SegmentTab('Important', count: 5),
        SegmentTab('Informational', count: 12),
      ],
    );
  }
}
