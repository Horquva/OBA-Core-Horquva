import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_platform.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_icons.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../viewmodels/overview_view_model.dart';
import '../widgets/app_text_field.dart';
import '../widgets/briefing_card.dart';
import '../widgets/home_app_bar.dart';
import '../widgets/signal_carousel.dart';
import '../widgets/signal_highlight_card.dart';
import '../widgets/stat_item.dart';
import '../widgets/status_pill.dart';

/// The Overview (home) screen — MVVM.
///
/// The View creates its [OverviewViewModel], observes it via Provider, and
/// renders loading / error / content based on the ViewModel's [ViewState].
class OverviewScreen extends StatelessWidget {
  const OverviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => OverviewViewModel()..load(),
      child: const _OverviewView(),
    );
  }
}

class _OverviewView extends StatelessWidget {
  const _OverviewView();

  @override
  Widget build(BuildContext context) {
    // watch<T>() rebuilds this view when the ViewModel notifies.
    final vm = context.watch<OverviewViewModel>();

    return Scaffold(
      appBar: HomeAppBar(onNotification: () {}, onAvatar: () {}),
      body: _body(vm),
    );
  }

  Widget _body(OverviewViewModel vm) {
    // Loading first, then error, otherwise the content.
    if (vm.isLoading) {
      // Platform-adaptive spinner: Cupertino on iOS, Material on Android.
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
    return _content(vm);
  }

  Widget _content(OverviewViewModel vm) {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        // Greeting with a decorative graphic on the right.
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(vm.greeting, style: AppTypography.displayLarge),
                  const SizedBox(height: AppSpacing.sm),
                  Text(vm.subtitle, style: AppTypography.bodyMedium),
                ],
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            // Transparent-background art floats directly on the app cream, so
            // there is no box and no background colour to match. Raised a little
            // so its top sits just above the greeting line.
            Transform.translate(
              offset: const Offset(0, -28),
              child: Image.asset(
                'assets/images/greeting_art.png',
                width: 170,
                height: 200,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) =>
                    const SizedBox.shrink(),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),

        // KPI stats — pulled up a little into the space beside the art, and
        // compact/left-aligned so they end before the right edge.
        Transform.translate(
          offset: const Offset(0, -28),
          child: FractionallySizedBox(
            alignment: Alignment.centerLeft,
            widthFactor: 0.8,
            child: Row(
              children: [
                for (int i = 0; i < vm.stats.length; i++) ...[
                  if (i > 0)
                    Container(
                      width: 1,
                      height: 36,
                      color: AppColors.border,
                    ),
                  Expanded(
                    child: StatItem(
                      icon: vm.stats[i].icon,
                      iconColor: vm.stats[i].iconColor,
                      value: vm.stats[i].value,
                      label: vm.stats[i].label,
                      valueStyle: AppTypography.headingMedium,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.lg),

        // Status pills — side by side in one row. Smaller text so they fit;
        // if a label is still too long it ellipsises instead of overflowing.
        Row(
          children: [
            Expanded(
              child: StatusPill(
                label: 'All Systems Operational',
                showChevron: true,
                labelStyle: AppTypography.label.copyWith(fontSize: 11),
                onTap: () {},
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: StatusPill(
                label: 'Last updated: 08:42 AM',
                icon: AppIcons.lastUpdated,
                labelStyle: AppTypography.label.copyWith(fontSize: 11),
                onTap: () {},
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.xl),

        // Featured signals carousel (from the ViewModel).
        SignalCarousel(
          cards: [
            for (final h in vm.highlights)
              SignalHighlightCard(
                severity: h.severity,
                number: h.number,
                title: h.title,
                meta: h.meta,
                actionLabel: 'Review & Take Action',
                onAction: () {},
              ),
          ],
        ),
        const SizedBox(height: AppSpacing.xl),

        // Executive briefing (DEMO).
        BriefingCard(
          label: 'EXECUTIVE BRIEFING',
          title: "Here's what matters most.",
          body: 'I analyzed 12,481 signals and identified 7 material changes.',
          startTitle: 'Start Briefing',
          startSubtitle: '8 min estimated',
          summaryTitle: 'Summary',
          summarySubtitle: 'Key highlights',
          estimateValue: '72s',
          estimateLabel: 'estimated',
          onStart: () {},
          onSummary: () {},
        ),
        const SizedBox(height: AppSpacing.xl),

        // Ask Castor input.
        Text('Ask Castor', style: AppTypography.titleMedium),
        const SizedBox(height: AppSpacing.sm),
        const AppTextField(
          hintText: 'Ask anything about your organization...',
          type: AppTextFieldType.ask,
        ),
      ],
    );
  }
}
