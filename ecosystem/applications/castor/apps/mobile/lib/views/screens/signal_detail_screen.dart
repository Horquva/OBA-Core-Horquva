import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_icons.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../core/app_platform.dart';
import '../../viewmodels/signal_detail_view_model.dart';
import '../../models/signal_detail.dart';
import '../widgets/app_top_bar.dart';
import '../widgets/severity_badge.dart';

/// The Signal Detail screen — MVVM.
///
/// Given a [signalId] (passed when a card is tapped), it creates its ViewModel,
/// loads that signal's full details from the repository (server/database in the
/// future), and shows them.
class SignalDetailScreen extends StatelessWidget {
  const SignalDetailScreen({super.key, required this.signalId});

  /// Which signal to show (its id comes from the tapped card).
  final String signalId;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => SignalDetailViewModel()..load(signalId),
      child: const _SignalDetailView(),
    );
  }
}

class _SignalDetailView extends StatelessWidget {
  const _SignalDetailView();

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<SignalDetailViewModel>();

    return Scaffold(
      appBar: AppTopBar(
        title: 'Signal Detail',
        onBack: () => Navigator.of(context).pop(),
        actionIcon: AppIcons.signalDetailShare,
        onAction: () {},
      ),
      body: _body(vm),
    );
  }

  Widget _body(SignalDetailViewModel vm) {
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

  Widget _content(SignalDetail d) {
    final Color color = severityColor(d.severity);

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        // Header: severity medallion + badge + title + date.
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
              child: Icon(severityIcon(d.severity), size: 22, color: color),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  SeverityBadge(severity: d.severity),
                  const SizedBox(height: AppSpacing.xs),
                  Text(d.title, style: AppTypography.headingLarge),
                  const SizedBox(height: AppSpacing.xs),
                  Text(d.dateLabel, style: AppTypography.caption),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),

        // Summary paragraph.
        Text(d.summary, style: AppTypography.bodyLarge),
        const SizedBox(height: AppSpacing.xl),

        // Key/value facts.
        _factRow('Category', d.category),
        _factRow('Domain', d.domain),
        _factRow('Impact', d.impact),
        _factRow('Probability', d.probability),
        _factRow('Related Systems', d.relatedSystems),
        const SizedBox(height: AppSpacing.xl),

        // "What happened?" section.
        Text('What happened?', style: AppTypography.titleMedium),
        const SizedBox(height: AppSpacing.sm),
        Text(d.whatHappened, style: AppTypography.bodyLarge),
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
