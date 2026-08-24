import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_platform.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_icons.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../viewmodels/signals_view_model.dart';
import '../widgets/app_top_bar.dart';
import '../widgets/segmented_tabs.dart';
import '../widgets/severity_badge.dart';
import '../widgets/signal_card.dart';
import 'signal_detail_screen.dart';

/// The Signals screen — MVVM.
///
/// Creates its [SignalsViewModel], loads the data (from the repository, which
/// will later be a server/database), and shows filter tabs + a list of cards.
class SignalsScreen extends StatelessWidget {
  const SignalsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => SignalsViewModel()..load(),
      child: const _SignalsView(),
    );
  }
}

class _SignalsView extends StatelessWidget {
  const _SignalsView();

  @override
  Widget build(BuildContext context) {
    // Rebuilds whenever the ViewModel notifies (load finished, tab changed).
    final vm = context.watch<SignalsViewModel>();

    return Scaffold(
      appBar: AppTopBar(
        title: 'Signals',
        subtitle: 'All critical and important signals',
        onBack: () {},
        actionIcon: AppIcons.signalsFilter,
        onAction: () {},
      ),
      body: Column(
        children: [
          // Filter tabs (All / Critical / Important / Informational).
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
            child: SegmentedTabs(
              tabs: [
                const SegmentTab('All Signals'),
                SegmentTab('Critical', count: vm.criticalCount),
                SegmentTab('Important', count: vm.importantCount),
                SegmentTab('Informational', count: vm.informationalCount),
              ],
              currentIndex: vm.filter.index,
              // Tab index maps 1:1 to the SignalFilter enum order.
              onTap: (i) => vm.setFilter(SignalFilter.values[i]),
            ),
          ),
          // The list fills the rest of the screen.
          Expanded(child: _body(vm)),
        ],
      ),
    );
  }

  Widget _body(SignalsViewModel vm) {
    // Loading first, then error, then the list.
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

    final signals = vm.signals;
    if (signals.isEmpty) {
      return Center(
        child: Text('No signals here.', style: AppTypography.bodyMedium),
      );
    }

    // A scrolling list of signal cards, with a gap between each.
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.lg),
      itemCount: signals.length,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (context, i) {
        final s = signals[i];
        return SignalCard(
          icon: severityIcon(s.severity),
          severity: s.severity,
          time: s.time,
          title: s.title,
          description: s.description,
          tags: s.tags,
          onTap: () => _openDetail(context, s.id),
        );
      },
    );
  }

  /// Opens the detail screen for the tapped signal (passing its id).
  void _openDetail(BuildContext context, String id) {
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
