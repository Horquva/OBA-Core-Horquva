import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_platform.dart';
import '../../models/decision.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_icons.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../viewmodels/decisions_view_model.dart';
import '../widgets/app_top_bar.dart';
import '../widgets/decision_card.dart';
import '../widgets/segmented_tabs.dart';
import '../widgets/severity_badge.dart';

/// The Decisions screen — MVVM.
///
/// Creates its [DecisionsViewModel], loads decisions from the repository
/// (server/database later), and shows filter tabs + a list of decision cards.
class DecisionsScreen extends StatelessWidget {
  const DecisionsScreen({super.key, this.onBack});

  /// Called when the back button is tapped (the shell clears the More section).
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => DecisionsViewModel()..load(),
      child: _DecisionsView(onBack: onBack),
    );
  }
}

class _DecisionsView extends StatelessWidget {
  const _DecisionsView({this.onBack});

  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<DecisionsViewModel>();

    return Scaffold(
      appBar: AppTopBar(
        title: 'Decisions',
        subtitle: 'Requiring your attention',
        onBack: onBack,
        actionIcon: AppIcons.decisionsFilter,
        onAction: () {},
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
            child: SegmentedTabs(
              tabs: [
                SegmentTab('All', count: vm.allCount),
                SegmentTab('Urgent', count: vm.urgentCount),
                SegmentTab('High Priority', count: vm.highCount),
                SegmentTab('Medium', count: vm.mediumCount),
              ],
              currentIndex: vm.filter.index,
              onTap: (i) => vm.setFilter(DecisionFilter.values[i]),
            ),
          ),
          Expanded(child: _body(vm)),
        ],
      ),
    );
  }

  Widget _body(DecisionsViewModel vm) {
    if (vm.isLoading) {
      return Center(
        child: AppPlatform.isIOS
            ? const CupertinoActivityIndicator(radius: 14)
            : const CircularProgressIndicator(color: AppColors.primary),
      );
    }
    if (vm.error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Text(
            vm.error!,
            textAlign: TextAlign.center,
            style: AppTypography.bodyMedium,
          ),
        ),
      );
    }

    final decisions = vm.decisions;
    if (decisions.isEmpty) {
      return Center(
        child: Text('No decisions here.', style: AppTypography.bodyMedium),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.lg),
      itemCount: decisions.length,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (context, i) {
        final d = decisions[i];
        return DecisionCard(
          icon: _priorityIcon(d.priority),
          severity: _prioritySeverity(d.priority),
          priorityLabel: _priorityLabel(d.priority),
          number: i + 1,
          title: d.title,
          meta: '${d.impact} impact  •  ${d.action}',
          due: 'Due: ${d.due}',
          onTap: () {}, // Decision detail screen comes later.
        );
      },
    );
  }
}

// ─── Priority → UI mappings (colour, label, icon) ────────────────────────────

/// Reuse the signal colour system: urgent = red, high = amber, medium = green.
Severity _prioritySeverity(DecisionPriority p) {
  switch (p) {
    case DecisionPriority.urgent:
      return Severity.critical;
    case DecisionPriority.high:
      return Severity.important;
    case DecisionPriority.medium:
      return Severity.informational;
  }
}

String _priorityLabel(DecisionPriority p) {
  switch (p) {
    case DecisionPriority.urgent:
      return 'URGENT';
    case DecisionPriority.high:
      return 'HIGH PRIORITY';
    case DecisionPriority.medium:
      return 'MEDIUM PRIORITY';
  }
}

IconData _priorityIcon(DecisionPriority p) {
  switch (p) {
    case DecisionPriority.urgent:
      return AppIcons.urgent;
    case DecisionPriority.high:
      return AppIcons.highPriority;
    case DecisionPriority.medium:
      return AppIcons.medium;
  }
}
