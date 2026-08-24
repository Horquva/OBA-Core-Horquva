import 'package:flutter/material.dart';

import '../../core/adaptive_tap.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_icons.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import 'app_text_field.dart';

/// Castor Design System — Ask Castor Card.
///
/// The AI prompt card shown on the Overview: a small "ASK CASTOR" label, a
/// serif question, and an input row (a text field with a mic, plus a round
/// green send button on the right).
class AskCastorCard extends StatelessWidget {
  const AskCastorCard({
    super.key,
    this.label = 'ASK CASTOR',
    this.title = 'How can I help you today?',
    this.hintText = 'Ask anything about your organization...',
    this.controller,
    this.onSend,
    this.onMic,
    this.onSubmitted,
  });

  /// The small uppercase label at the top.
  final String label;

  /// The serif question shown under the label.
  final String title;

  /// Placeholder text inside the input.
  final String hintText;

  /// Optional controller to read the typed text.
  final TextEditingController? controller;

  /// Called when the round send button is tapped.
  final VoidCallback? onSend;

  /// Called when the mic icon inside the field is tapped.
  final VoidCallback? onMic;

  /// Called when the user submits from the keyboard.
  final ValueChanged<String>? onSubmitted;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(color: AppColors.shadow, blurRadius: 12, offset: Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Label row: small brand star + "ASK CASTOR".
          Row(
            children: [
              const Icon(AppIcons.castor, size: 16, color: AppColors.primary),
              const SizedBox(width: AppSpacing.xs),
              Text(
                label,
                style: AppTypography.overline.copyWith(color: AppColors.primary),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),

          // The serif question.
          Text(title, style: AppTypography.headingMedium),
          const SizedBox(height: AppSpacing.lg),

          // Input row: text field (with mic) + round send button.
          Row(
            children: [
              Expanded(
                child: AppTextField(
                  controller: controller,
                  hintText: hintText,
                  type: AppTextFieldType.ask,
                  onSubmitted: onSubmitted,
                  onIconTap: onMic,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              _sendButton(),
            ],
          ),
        ],
      ),
    );
  }

  /// The round green button with the Castor star.
  Widget _sendButton() {
    const double size = 52;
    return AdaptiveTap(
      onTap: onSend,
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
