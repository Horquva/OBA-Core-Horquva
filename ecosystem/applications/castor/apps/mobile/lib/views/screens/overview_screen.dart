import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_platform.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_icons.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../viewmodels/overview_view_model.dart';
import '../widgets/ask_castor_card.dart';
import '../widgets/briefing_card.dart';
import '../widgets/home_app_bar.dart';
import '../widgets/signal_carousel.dart';
import '../widgets/signal_highlight_card.dart';
import '../widgets/stat_item.dart';
import '../widgets/status_pill.dart';
import 'signal_detail_screen.dart';

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
      body: _body(context, vm),
    );
  }

  Widget _body(BuildContext context, OverviewViewModel vm) {
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
    return _content(context, vm);
  }

  Widget _content(BuildContext context, OverviewViewModel vm) {
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
            // const SizedBox(width: AppSpacing.sm),
            // Transparent-background art floats directly on the app cream, so
            // there is no box and no background colour to match. Raised a little
            // so its top sits just above the greeting line.
            // The art paints 200 tall but only reserves ~120 in layout (it
            // overflows downward beside the stats), so there is no dead space
            // under the greeting. Raised a little so its top is above the line.
            Transform.translate(
              offset: const Offset(0, -20),
              child: SizedBox(
                width: 170,
                height: 120,
                child: OverflowBox(
                  minWidth: 170,
                  maxWidth: 170,
                  minHeight: 200,
                  maxHeight: 200,
                  alignment: Alignment.topCenter,
                  child: Image.asset(
                    'assets/images/greeting_art.png',
                    width: 170,
                    height: 200,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) =>
                        const SizedBox.shrink(),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),

        // KPI stats — compact and left-aligned so they end before the right
        // edge. They sit high beside the art because the art reserves little
        // vertical space (see the OverflowBox above).
        FractionallySizedBox(
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
        const SizedBox(height: AppSpacing.md),

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

        // Featured signals carousel — the SAME signals as the Signals screen
        // (top 5). Tapping the action opens that signal's detail.
        SignalCarousel(
          cards: [
            for (int i = 0; i < vm.topSignals.length; i++)
              SignalHighlightCard(
                severity: vm.topSignals[i].severity,
                number: (i + 1).toString().padLeft(2, '0'),
                title: vm.topSignals[i].title,
                meta:
                    'Business Impact: ${vm.topSignals[i].impact}  •  Probability: ${vm.topSignals[i].probability}',
                actionLabel: 'Review & Take Action',
                onAction: () => _openSignalDetail(context, vm.topSignals[i].id),
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

        // Ask Castor card (AI prompt).
        AskCastorCard(
          onSend: () {},
          onMic: () {},
        ),
      ],
    );
  }

  /// Opens the detail screen for a signal (adaptive route).
  void _openSignalDetail(BuildContext context, String id) {
    final route = AppPlatform.isIOS
        ? CupertinoPageRoute<void>(
            builder: (_) => SignalDetailScreen(signalId: id),
          )
        : MaterialPageRoute<void>(
            builder: (_) => SignalDetailScreen(signalId: id),
          );
    Navigator.of(context).push(route);
  }
}
