import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_platform.dart';
import '../../models/briefing.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_icons.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../viewmodels/briefing_view_model.dart';
import '../widgets/app_top_bar.dart';
import '../widgets/performance_card.dart';
import '../widgets/segmented_tabs.dart';

/// The Executive Briefing screen — MVVM.
class BriefingScreen extends StatelessWidget {
  const BriefingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => BriefingViewModel()..load(),
      child: const _BriefingView(),
    );
  }
}

class _BriefingView extends StatelessWidget {
  const _BriefingView();

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<BriefingViewModel>();

    return Scaffold(
      appBar: AppTopBar(
        title: 'Executive Briefing',
        subtitle: vm.briefing?.dateLabel ?? 'Today',
        onBack: () {},
        actionIcon: AppIcons.briefingShare,
        onAction: () {},
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
            child: SegmentedTabs(
              tabs: const [
                SegmentTab('Summary'),
                SegmentTab('Key Changes'),
                SegmentTab('Impact'),
                SegmentTab('Recommendations'),
              ],
              currentIndex: vm.tab.index,
              onTap: (i) => vm.setTab(BriefingTab.values[i]),
            ),
          ),
          Expanded(child: _body(vm)),
        ],
      ),
    );
  }

  Widget _body(BriefingViewModel vm) {
    if (vm.isLoading) {
      return Center(
        child: AppPlatform.isIOS
            ? const CupertinoActivityIndicator(radius: 14)
            : const CircularProgressIndicator(color: AppColors.primary),
      );
    }
    if (vm.error != null || vm.briefing == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Text(
            vm.error ?? 'Not available.',
            textAlign: TextAlign.center,
            style: AppTypography.bodyMedium,
          ),
        ),
      );
    }

    // Only the Summary tab has content for now.
    if (vm.tab != BriefingTab.summary) {
      return Center(
        child: Text('Coming soon', style: AppTypography.bodyMedium),
      );
    }
    return _summary(vm.briefing!);
  }

  Widget _summary(Briefing b) {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        PerformanceCard(
          value: b.performanceLabel,
          caption: b.performanceCaption,
          score: b.score,
          scoreMax: b.scoreMax,
        ),
        const SizedBox(height: AppSpacing.lg),
        _keyTakeaways(b),
        const SizedBox(height: AppSpacing.lg),
        _recommendedFocus(b),
      ],
    );
  }

  // ─── Key takeaways ─────────────────────────────────────────────────────────
  Widget _keyTakeaways(Briefing b) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Key Takeaways', style: AppTypography.titleMedium),
          const SizedBox(height: AppSpacing.md),
          for (int i = 0; i < b.takeaways.length; i++) ...[
            if (i > 0)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: AppSpacing.md),
                child: Divider(height: 1, color: AppColors.border),
              ),
            _takeawayRow(b.takeaways[i]),
          ],
        ],
      ),
    );
  }

  Widget _takeawayRow(BriefingTakeaway t) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 40,
          height: 40,
          alignment: Alignment.center,
          decoration: const BoxDecoration(
            color: AppColors.surfaceMuted,
            shape: BoxShape.circle,
          ),
          child: Icon(_takeawayIcon(t.kind),
              size: 18, color: AppColors.textPrimary),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(child: Text(t.text, style: AppTypography.bodyLarge)),
      ],
    );
  }

  IconData _takeawayIcon(TakeawayKind kind) {
    switch (kind) {
      case TakeawayKind.risk:
        return AppIcons.risks; // shield
      case TakeawayKind.changes:
        return AppIcons.sparkle;
      case TakeawayKind.performance:
        return AppIcons.highPriority; // trending up
    }
  }

  // ─── Recommended focus ─────────────────────────────────────────────────────
  Widget _recommendedFocus(Briefing b) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Recommended Focus', style: AppTypography.titleMedium),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.critical.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: const Icon(AppIcons.risks,
                    size: 20, color: AppColors.critical),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      b.focusTitle,
                      style: AppTypography.bodyLarge
                          .copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 2),
                    Text(b.focusMeta, style: AppTypography.bodyMedium),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.textTertiary),
            ],
          ),
        ],
      ),
    );
  }
}
