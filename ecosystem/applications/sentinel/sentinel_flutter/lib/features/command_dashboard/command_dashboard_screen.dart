import 'package:flutter/material.dart';
import '../_ui/navigation/sentinel_shell.dart';
import '../_ui/theme/sentinel_colors.dart';
import '../_ui/theme/sentinel_spacing.dart';
import '../_ui/theme/sentinel_text_styles.dart';
import '../_ui/theme/sentinel_radii.dart';

/// Command Dashboard (1:1 Stitch Reference)
/// Owner: Muhammad Anas (Experience Layer)
class CommandDashboardScreen extends StatelessWidget {
  const CommandDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final mockData = _getMockStitchData();

    return SentinelScaffold(
      title: 'SENTINEL',
      actions: const [
        CircleAvatar(
          radius: 16,
          backgroundColor: SentinelColors.surfaceHigh,
          child: Icon(Icons.person, color: SentinelColors.textSecondary),
        ),
        SizedBox(width: 16),
      ],
      body: SingleChildScrollView(
        padding: const EdgeInsets.only(
          left: SentinelSpacing.md, // 16px
          right: SentinelSpacing.md,
          bottom: 24, // Don't need 100 padding since Scaffold body doesn't overlap BottomAppBar
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: SentinelSpacing.md),
            _buildHeroSection(),
            const SizedBox(height: SentinelSpacing.xl),
            _buildStatsRow(mockData.stats),
            const SizedBox(height: SentinelSpacing.xl),
            _buildSecurityMap(),
            const SizedBox(height: SentinelSpacing.xl),
            _buildCriticalAlerts(mockData.alerts),
          ],
        ),
      ),
    );
  }

  Widget _buildHeroSection() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Security Posture', style: SentinelTextStyles.labelSm.copyWith(color: SentinelColors.textSecondary, fontSize: 14)),
              Text(
                'FORTIFIED',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w900,
                  fontSize: 36,
                  color: SentinelColors.primaryGlow,
                  letterSpacing: 2,
                  shadows: [
                    BoxShadow(color: SentinelColors.primaryGlow.withValues(alpha: 0.6), blurRadius: 8),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Active Defense. Total Visibility.\nZero Compromise.',
                style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold, height: 1.5),
              ),
            ],
          ),
        ),
        SizedBox(
          width: 90,
          height: 90,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: SentinelColors.primaryGlow.withValues(alpha: 0.3), width: 1.5),
                  boxShadow: [
                    BoxShadow(color: SentinelColors.primaryGlow.withValues(alpha: 0.1), blurRadius: 8),
                  ],
                ),
              ),
              Container(
                width: 60,
                height: 60,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: SentinelColors.primaryGlow,
                ),
                child: const Icon(
                  Icons.security,
                  size: 32,
                  color: Colors.black, // Dark icon inside the bright cyan circle based on typical glowing themes, but screenshot shows glowing shield. Wait, screenshot shows a cyan shield inside a dark circle with cyan border.
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatsRow(List<_MockStat> stats) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return Row(
          children: stats.map((s) {
            final isLast = s == stats.last;
            return Expanded(
              child: Container(
                margin: EdgeInsets.only(right: isLast ? 0 : 12),
                child: _buildStatCard(s, constraints.maxWidth),
              ),
            );
          }).toList(),
        );
      },
    );
  }

  Widget _buildStatCard(_MockStat s, double maxWidth) {
    // Make text responsive based on screen width
    final bool isSmall = maxWidth < 600;
    
    return Container(
      padding: EdgeInsets.all(isSmall ? 8 : 12),
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B), // Very dark blue/black
        borderRadius: BorderRadius.circular(SentinelRadii.md),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(s.title, style: TextStyle(color: SentinelColors.textSecondary, fontSize: isSmall ? 9 : 11), maxLines: 1, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(s.value, style: TextStyle(color: s.valueColor, fontSize: isSmall ? 20 : 28, fontWeight: FontWeight.bold)),
                if (s.suffix != null)
                  Text(s.suffix!, style: TextStyle(color: SentinelColors.textSecondary, fontSize: isSmall ? 10 : 12)),
              ],
            ),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Row(
              children: [
                if (s.trendIcon != null) ...[
                  Icon(s.trendIcon, color: s.trendColor, size: isSmall ? 8 : 10),
                  const SizedBox(width: 2),
                ],
                Text(
                  s.trend,
                  style: TextStyle(color: s.trendColor, fontSize: isSmall ? 9 : 11, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSecurityMap() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Security Map', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                    Text('Live Attack Surface', style: TextStyle(color: SentinelColors.textSecondary, fontSize: 12)),
                  ],
                ),
                Row(
                  children: [
                    Text('Explore', style: TextStyle(color: SentinelColors.primaryGlow, fontSize: 12, fontWeight: FontWeight.bold)),
                    const Icon(Icons.chevron_right, color: SentinelColors.primaryGlow, size: 16),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Colors.white10),
          Container(
            height: 200,
            width: double.infinity,
            decoration: const BoxDecoration(
              color: Color(0xFF050810),
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(16)),
              image: DecorationImage(
                image: NetworkImage('https://lh3.googleusercontent.com/aida-public/AB6AXuBUA-ACtrGV-0UNWEd-z4K6y6p_dtsABg9wj-vmLfIZrwIUgfyni7u2KXCgzA7HSM9e_6wxX94SEYAoGb2iGkz4EbwbKlI-fzwbNykuz5L4TSF2c0xG8jmRdtfz_rJ_mEY0TeguCji67Kho5qOGbIN9c9SCbSqaCVmsibO7hQX9dmz4qme_65_Rg-iubMtvRwJbzvn35tAtPJgs5Nuu5kWLKefCttj0IdPYrrS-pLtwYcvSyAu_p5u8WQ'), // Stitch world map URL
                fit: BoxFit.cover,
                opacity: 0.8,
              ),
            ),
            child: Stack(
              children: [
                Positioned(
                  top: 90,
                  left: 100,
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: SentinelColors.blocked,
                      shape: BoxShape.circle,
                      boxShadow: [BoxShadow(color: SentinelColors.blocked, blurRadius: 10)],
                    ),
                  ),
                ),
                Positioned(
                  bottom: 50,
                  right: 90,
                  child: Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0B101D),
                      shape: BoxShape.circle,
                      border: Border.all(color: SentinelColors.primaryGlow.withValues(alpha: 0.8)),
                      boxShadow: [BoxShadow(color: SentinelColors.primaryGlow, blurRadius: 10)],
                    ),
                    child: const Icon(Icons.security, size: 14, color: SentinelColors.primaryGlow),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCriticalAlerts(List<_MockAlert> alerts) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Text('Critical Alerts', style: TextStyle(color: SentinelColors.blocked, fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: SentinelColors.surfaceHigh,
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: Colors.white10),
                  ),
                  child: const Text('3', style: TextStyle(color: SentinelColors.textSecondary, fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const Row(
              children: [
                Text('View All', style: TextStyle(color: SentinelColors.textSecondary, fontSize: 12)),
                Icon(Icons.chevron_right, color: SentinelColors.textSecondary, size: 16),
              ],
            ),
          ],
        ),
        const SizedBox(height: SentinelSpacing.md),
        Column(
          children: alerts.map((a) {
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF0D121B),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: SentinelColors.blocked.withValues(alpha: 0.5)),
                boxShadow: [BoxShadow(color: SentinelColors.blocked.withValues(alpha: 0.05), blurRadius: 8)],
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: SentinelColors.blocked.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: SentinelColors.blocked.withValues(alpha: 0.3)),
                    ),
                    child: const Icon(Icons.security, color: SentinelColors.blocked),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(a.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                        const SizedBox(height: 4),
                        Text(a.subtitle, style: const TextStyle(color: SentinelColors.textSecondary, fontSize: 11)),
                      ],
                    ),
                  ),
                  Text(a.time, style: const TextStyle(color: SentinelColors.textSecondary, fontSize: 11)),
                ],
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}

// ── Mock Data to Match Stitch ──────────────────────────────────────────────────
class _MockDashboardData {
  final List<_MockStat> stats;
  final List<_MockAlert> alerts;
  _MockDashboardData(this.stats, this.alerts);
}

class _MockStat {
  final String title;
  final String value;
  final String? suffix;
  final String trend;
  final Color valueColor;
  final Color trendColor;
  final IconData? trendIcon;
  _MockStat(this.title, this.value, this.suffix, this.trend, this.valueColor, this.trendColor, [this.trendIcon]);
}

class _MockAlert {
  final String title;
  final String subtitle;
  final String time;
  _MockAlert(this.title, this.subtitle, this.time);
}

_MockDashboardData _getMockStitchData() {
  return _MockDashboardData(
    [
      _MockStat('Security Score', '96', '/100', '+4.2%', SentinelColors.primaryGlow, SentinelColors.healthy),
      _MockStat('Active Threats', '12', null, '-3', SentinelColors.blocked, SentinelColors.blocked, Icons.arrow_downward),
      _MockStat('Compliance', '100%', '%', 'All Good', Colors.white, SentinelColors.healthy),
      _MockStat('Systems', '28', null, 'Online', Colors.white, SentinelColors.healthy, Icons.circle),
    ],
    [
      _MockAlert('Brute Force Attack Blocked', 'Authentication Service', '2m ago'),
    ],
  );
}
