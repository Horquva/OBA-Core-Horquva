import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/adaptive_tap.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_icons.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../viewmodels/ask_castor_view_model.dart';
import '../widgets/app_text_field.dart';
import '../widgets/app_top_bar.dart';
import '../widgets/bottom_nav_bar.dart';

/// The Ask Castor screen — the AI prompt surface.
///
/// Shows a hero prompt, suggested starter questions, and an input bar. Sending
/// to the real AI is wired later (that is the AI Experience owner's contract).
class AskCastorScreen extends StatelessWidget {
  const AskCastorScreen({super.key, this.onNavTap});

  /// Called when a bottom-nav tab is tapped (the shell pops Ask and switches).
  final ValueChanged<int>? onNavTap;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AskCastorViewModel(),
      child: _AskCastorView(onNavTap: onNavTap),
    );
  }
}

class _AskCastorView extends StatelessWidget {
  const _AskCastorView({this.onNavTap});

  final ValueChanged<int>? onNavTap;

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<AskCastorViewModel>();

    return Scaffold(
      appBar: AppTopBar(
        title: 'Ask Castor',
        onBack: () => Navigator.of(context).pop(),
        actionIcon: AppIcons.askHistory,
        onAction: () {},
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                children: [
                  const SizedBox(height: AppSpacing.xxl),
                  // Hero: the real Castor brand mark + question + subtitle.
                  Center(
                    child: Image.asset(
                      'assets/images/castor_mark.png',
                      width: 64,
                      height: 64,
                      errorBuilder: (context, error, stackTrace) => const Icon(
                        AppIcons.castor,
                        size: 56,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    'How can I help you today?',
                    textAlign: TextAlign.center,
                    style: AppTypography.headingLarge,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'Ask anything about your organization.',
                    textAlign: TextAlign.center,
                    style: AppTypography.bodyMedium,
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  // Suggested prompts.
                  for (final s in vm.suggestions) ...[
                    _suggestion(vm, s),
                    const SizedBox(height: AppSpacing.md),
                  ],
                ],
              ),
            ),
            _inputBar(vm),
          ],
        ),
      ),
      bottomNavigationBar: onNavTap != null
          ? BottomNavBar(
              currentIndex: -1,
              onTap: onNavTap!,
              onCastorTap: () {},
            )
          : null,
    );
  }

  /// One suggested prompt card: text + arrow. Tapping puts it in the input.
  Widget _suggestion(AskCastorViewModel vm, String prompt) {
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppRadius.lg),
      side: const BorderSide(color: AppColors.border),
    );

    return Material(
      color: AppColors.surface,
      shape: shape,
      child: InkWell(
        onTap: () => vm.useSuggestion(prompt),
        customBorder: shape,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.md,
          ),
          child: Row(
            children: [
              Expanded(child: Text(prompt, style: AppTypography.bodyLarge)),
              const SizedBox(width: AppSpacing.md),
              const Icon(AppIcons.send, size: 18, color: AppColors.textSecondary),
            ],
          ),
        ),
      ),
    );
  }

  /// The bottom input bar: a text field (with mic) + a round send button.
  Widget _inputBar(AskCastorViewModel vm) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.sm,
        AppSpacing.lg,
        AppSpacing.lg,
      ),
      child: Row(
        children: [
          Expanded(
            child: AppTextField(
              controller: vm.input,
              hintText: 'Ask anything...',
              type: AppTextFieldType.ask,
              onSubmitted: (_) => vm.send(),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          _sendButton(vm),
        ],
      ),
    );
  }

  Widget _sendButton(AskCastorViewModel vm) {
    const double size = 52;
    return AdaptiveTap(
      onTap: vm.send,
      borderRadius: BorderRadius.circular(size / 2),
      child: Container(
        width: size,
        height: size,
        decoration: const BoxDecoration(
          color: AppColors.primary,
          shape: BoxShape.circle,
        ),
        child: const Icon(AppIcons.castor, color: AppColors.onPrimary, size: 24),
      ),
    );
  }
}
