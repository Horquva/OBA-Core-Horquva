import 'package:flutter/material.dart';
import '../theme/sentinel_colors.dart';
import '../theme/sentinel_spacing.dart';
import '../theme/sentinel_text_styles.dart';

// ─────────────────────────────────────────────────────────────────────────────
// SENTINEL STATE VIEWS
// Owner: Muhammad Anas (Experience Layer)
//
// These widgets cover every non-data state a screen can be in.
// They are consumed by domain screens that switch on M.Ali's state types.
//
// RULE: Never show SentinelLoadingView as "success". Never show
// SentinelEmptyView when a real error occurred — those are distinct states.
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Loading ────────────────────────────────────────────────────────────────
/// Show while M.Ali's state layer is fetching data.
/// Must be visually distinct from Empty and Healthy.
class SentinelLoadingView extends StatelessWidget {
  final String? message;
  const SentinelLoadingView({this.message, super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            width: 40,
            height: 40,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              color: SentinelColors.primary,
            ),
          ),
          const SizedBox(height: SentinelSpacing.md),
          Text(
            message ?? 'Loading…',
            style: SentinelTextStyles.bodyMd,
          ),
        ],
      ),
    );
  }
}

// ── 2. Empty (Backend returned 0 results) ─────────────────────────────────────
/// Show ONLY when backend returned HTTP 200 with an empty list.
/// Do NOT use for errors or unavailable state.
class SentinelEmptyView extends StatelessWidget {
  final String title;
  final String subtitle;

  const SentinelEmptyView({
    this.title = 'No Data',
    this.subtitle = 'The backend returned zero results.',
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(SentinelSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.inbox_outlined,
              size: 48,
              color: SentinelColors.textMuted,
            ),
            const SizedBox(height: SentinelSpacing.md),
            Text(title, style: SentinelTextStyles.headlineMd),
            const SizedBox(height: SentinelSpacing.sm),
            Text(
              subtitle,
              style: SentinelTextStyles.bodyMd,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

// ── 3. Server Error (5xx / timeout / parse failure) ───────────────────────────
/// Show when M.Ali's state layer reports a backend or network error.
/// The [onRetry] callback should call M.Ali's provider refresh method.
class SentinelErrorView extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const SentinelErrorView({
    required this.message,
    this.onRetry,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(SentinelSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.error_outline_rounded,
              size: 48,
              color: SentinelColors.blocked,
            ),
            const SizedBox(height: SentinelSpacing.md),
            Text('Backend Error', style: SentinelTextStyles.headlineMd),
            const SizedBox(height: SentinelSpacing.sm),
            Text(
              message,
              style: SentinelTextStyles.bodyMd,
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: SentinelSpacing.lg),
              OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Retry'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: SentinelColors.primary,
                  side: const BorderSide(color: SentinelColors.primary),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── 4. Access Denied (403) ────────────────────────────────────────────────────
/// Show when M.Ali's state layer reports a 403 authorization denial.
/// Do NOT show any previously visible protected content.
class SentinelDeniedView extends StatelessWidget {
  const SentinelDeniedView({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(SentinelSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.block_rounded,
              size: 48,
              color: SentinelColors.blocked,
            ),
            const SizedBox(height: SentinelSpacing.md),
            Text('Access Denied', style: SentinelTextStyles.headlineMd),
            const SizedBox(height: SentinelSpacing.sm),
            Text(
              'You do not have permission to view this section.',
              style: SentinelTextStyles.bodyMd,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

// ── 5. Unauthenticated (401) ──────────────────────────────────────────────────
/// Show when M.Ali's auth state is unauthenticated or session has expired.
/// Anas presents this state — M.Ali handles the redirect/logout mechanics.
class SentinelUnauthenticatedView extends StatelessWidget {
  const SentinelUnauthenticatedView({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(SentinelSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.lock_outline_rounded,
              size: 48,
              color: SentinelColors.warning,
            ),
            const SizedBox(height: SentinelSpacing.md),
            Text('Session Expired', style: SentinelTextStyles.headlineMd),
            const SizedBox(height: SentinelSpacing.sm),
            Text(
              'Your session has expired. Please sign in again.',
              style: SentinelTextStyles.bodyMd,
              textAlign: TextAlign.center,
            ),
            // Note: redirect/login navigation is triggered by M.Ali's
            // auth state changes — Anas does NOT redirect here.
          ],
        ),
      ),
    );
  }
}

// ── 6. Unavailable ────────────────────────────────────────────────────────────
/// Show when a backend capability is not yet integrated, not reachable,
/// or not within the current sprint scope.
/// This must NEVER default to Healthy or show any security status.
class SentinelUnavailableView extends StatelessWidget {
  final String? domainName;

  const SentinelUnavailableView({this.domainName, super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(SentinelSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_off_rounded,
              size: 48,
              color: SentinelColors.unavailable,
            ),
            const SizedBox(height: SentinelSpacing.md),
            Text(
              domainName != null ? '$domainName Unavailable' : 'Unavailable',
              style: SentinelTextStyles.headlineMd,
            ),
            const SizedBox(height: SentinelSpacing.sm),
            Text(
              'This capability is not available yet.',
              style: SentinelTextStyles.bodyMd,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
