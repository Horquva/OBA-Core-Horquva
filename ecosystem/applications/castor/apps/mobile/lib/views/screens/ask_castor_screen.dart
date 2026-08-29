import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/adaptive_tap.dart';
import '../../models/chat_message.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_icons.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../viewmodels/ask_castor_view_model.dart';
import '../widgets/app_text_field.dart';
import '../widgets/app_top_bar.dart';
import '../widgets/bottom_nav_bar.dart';

/// The Ask Castor screen — the AI chat surface.
///
/// Shows a hero + suggestions before the first message, then the conversation.
/// Replies come from [AskCastorViewModel] (a demo reply for now).
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
              child: vm.hasMessages ? _conversation(vm) : _emptyState(vm),
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

  // ─── Empty state: hero + suggestions ───────────────────────────────────────
  Widget _emptyState(AskCastorViewModel vm) {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        const SizedBox(height: AppSpacing.xxl),
        Center(
          child: Image.asset(
            'assets/images/castor_mark.png',
            width: 100,
            height: 100,
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
        for (final s in vm.suggestions) ...[
          _suggestion(vm, s),
          const SizedBox(height: AppSpacing.md),
        ],
      ],
    );
  }

  Widget _suggestion(AskCastorViewModel vm, String prompt) {
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppRadius.lg),
      side: const BorderSide(color: AppColors.border),
    );

    return Material(
      color: AppColors.surface,
      shape: shape,
      child: InkWell(
        onTap: () => vm.sendPrompt(prompt),
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
              const Icon(AppIcons.send,
                  size: 18, color: AppColors.textSecondary),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Conversation ──────────────────────────────────────────────────────────
  Widget _conversation(AskCastorViewModel vm) {
    // Normal order: the first message is at the top, newest below it.
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        for (final m in vm.messages) _bubble(m),
        if (vm.sending) _typing(),
      ],
    );
  }

  Widget _bubble(ChatMessage m) {
    final bool isUser = m.role == ChatRole.user;

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 300),
        child: Container(
          margin: const EdgeInsets.only(bottom: AppSpacing.sm),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm,
          ),
          decoration: BoxDecoration(
            color: isUser ? AppColors.primary : AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: isUser ? null : Border.all(color: AppColors.border),
          ),
          child: Text(
            m.text,
            style: AppTypography.bodyLarge.copyWith(
              color: isUser ? AppColors.onPrimary : AppColors.textPrimary,
            ),
          ),
        ),
      ),
    );
  }

  Widget _typing() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: AppColors.border),
        ),
        child: const _TypingDots(),
      ),
    );
  }

  // ─── Input bar ─────────────────────────────────────────────────────────────
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
        child:
            const Icon(AppIcons.castor, color: AppColors.onPrimary, size: 24),
      ),
    );
  }
}

/// Three little green dots that bounce in a loop — the "typing" indicator.
class _TypingDots extends StatefulWidget {
  const _TypingDots();

  @override
  State<_TypingDots> createState() => _TypingDotsState();
}

class _TypingDotsState extends State<_TypingDots>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1000),
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            // Each dot is a little behind the previous one.
            final double t = (_controller.value + i * 0.18) % 1.0;
            final double wave = (math.sin(t * 2 * math.pi) + 1) / 2; // 0..1
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2.5),
              child: Transform.translate(
                offset: Offset(0, -3 * wave),
                child: Opacity(
                  opacity: 0.35 + 0.65 * wave,
                  child: Container(
                    width: 7,
                    height: 7,
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}
