import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_platform.dart';
import '../../models/decision_detail.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_icons.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../viewmodels/decision_detail_view_model.dart';
import '../widgets/app_top_bar.dart';
import '../widgets/decision_style.dart';
import '../widgets/severity_badge.dart';

/// The Decision Detail screen — MVVM.
///
/// Given a [decisionId] (from the tapped card), it creates its ViewModel, loads
/// that decision's full details from the repository, and shows them.
class DecisionDetailScreen extends StatelessWidget {
  const DecisionDetailScreen({super.key, required this.decisionId});

  final String decisionId;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => DecisionDetailViewModel()..load(decisionId),
      child: const _DecisionDetailView(),
    );
  }
}

class _DecisionDetailView extends StatelessWidget {
  const _DecisionDetailView();

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<DecisionDetailViewModel>();

    return Scaffold(
      appBar: AppTopBar(
        title: 'Decision Detail',
        onBack: () => Navigator.of(context).pop(),
        actionIcon: AppIcons.decisionDetailShare,
        onAction: () {},
      ),
      body: _body(vm),
    );
  }

  Widget _body(DecisionDetailViewModel vm) {
    if (vm.isLoading) {
      return Center(
        child: AppPlatform.isIOS
            ? const CupertinoActivityIndicator(radius: 14)
            : const CircularProgressIndicator(color: AppColors.primary),
      );
    }
    if (vm.error != null || vm.detail == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Text(
            vm.error ?? 'Not found.',
            textAlign: TextAlign.center,
            style: AppTypography.bodyMedium,
          ),
        ),
      );
    }
    return _content(vm.detail!);
  }

  Widget _content(DecisionDetail d) {
    final Color color = severityColor(decisionSeverity(d.priority));

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        // Header: priority medallion + badge + title + due.
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Icon(
                decisionPriorityIcon(d.priority),
                size: 22,
                color: color,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  SeverityBadge(
                    severity: decisionSeverity(d.priority),
                    label: decisionPriorityLabel(d.priority),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(d.title, style: AppTypography.headingLarge),
                  const SizedBox(height: AppSpacing.xs),
                  Text('Due: ${d.dueLabel}', style: AppTypography.caption),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),

        // Description paragraph.
        Text(d.description, style: AppTypography.bodyLarge),
        const SizedBox(height: AppSpacing.xl),

        // Key/value facts.
        _factRow('Impact', d.impact),
        _factRow('Priority', d.priorityText),
        _factRow('Business Area', d.businessArea),
        _factRow('Owner', d.owner),
        _factRow('Estimated Value', d.estimatedValue),
        const SizedBox(height: AppSpacing.xl),

        // Summary section.
        Text('Summary', style: AppTypography.titleMedium),
        const SizedBox(height: AppSpacing.sm),
        Text(d.summary, style: AppTypography.bodyLarge),
      ],
    );
  }

  /// One "Label      Value" row in the facts list.
  Widget _factRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 150,
            child: Text(label, style: AppTypography.bodyMedium),
          ),
          const SizedBox(width: AppSpacing.xxl),
          Expanded(
            child: Text(
              value,
              style:
                  AppTypography.bodyLarge.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
