import 'package:flutter/material.dart';
import '../_ui/navigation/sentinel_shell.dart';
import '../_ui/theme/sentinel_colors.dart';
import '../_ui/theme/sentinel_spacing.dart';
import '../_ui/theme/sentinel_text_styles.dart';
import '../_ui/theme/sentinel_radii.dart';
import 'package:go_router/go_router.dart';
import '../_ui/navigation/route_names.dart';

/// Sentinel Overview Dashboard (1:1 Stitch Reference)
/// Owner: Muhammad Anas (Experience Layer)
class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // TEMPORARY: Using Mock Data to match Stitch UI exactly.
    // Day 2 TODO: Replace with `context.watch<DashboardProvider>().state`
    final mockData = _getMockStitchData();

    return SentinelScaffold(
      title: 'SENTINEL',
      actions: [
        IconButton(
          icon: const Icon(Icons.notifications_none),
          color: SentinelColors.textSecondary,
          onPressed: () {},
        ),
      ],
      body: Stack(
        children: [
          // Ambient Glow
          Positioned(
            top: 50,
            left: 0,
            right: 0,
            child: Container(
              height: 400,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    SentinelColors.primaryGlow.withValues(alpha: 0.15),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 1.0],
                ),
              ),
            ),
          ),
          SingleChildScrollView(
            padding: const EdgeInsets.only(
              left: SentinelSpacing.screenMargin,
              right: SentinelSpacing.screenMargin,
              bottom: 100, // For FAB spacing
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: SentinelSpacing.xl),
                _buildSystemHealthRing(mockData.systemHealthScore),
                const SizedBox(height: SentinelSpacing.xxl),
                _buildDomainHealthSection(mockData.domains),
                const SizedBox(height: SentinelSpacing.xxl),
                _buildRecentFindingsSection(context, mockData.findings),
                const SizedBox(height: SentinelSpacing.xl),
                _buildScanButton(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSystemHealthRing(int score) {
    return Center(
      child: SizedBox(
        width: 250,
        height: 250,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Outer dashed ring
            Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: SentinelColors.primary.withValues(alpha: 0.2), width: 1),
              ),
            ),
            // Inner blur background
            Container(
              margin: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: SentinelColors.surfaceHigh.withValues(alpha: 0.3),
                border: Border.all(color: SentinelColors.border.withValues(alpha: 0.3)),
              ),
            ),
            // Progress Ring
            SizedBox(
              width: 218,
              height: 218,
              child: CircularProgressIndicator(
                value: score / 100,
                strokeWidth: 4,
                backgroundColor: SentinelColors.surfaceHigh,
                valueColor: const AlwaysStoppedAnimation<Color>(SentinelColors.primaryGlow),
              ),
            ),
            // Text Content
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                RichText(
                  text: TextSpan(
                    text: score.toString(),
                    style: SentinelTextStyles.displayHero.copyWith(
                      color: SentinelColors.primaryGlow,
                      shadows: [
                        const BoxShadow(color: SentinelColors.primaryGlow, blurRadius: 10),
                      ],
                    ),
                    children: [
                      TextSpan(
                        text: '/100',
                        style: SentinelTextStyles.headlineMd.copyWith(color: SentinelColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'SYSTEM HEALTH',
                  style: SentinelTextStyles.labelCaps.copyWith(color: SentinelColors.textSecondary),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDomainHealthSection(List<_MockDomain> domains) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Domain Health', style: SentinelTextStyles.headlineMd),
        const SizedBox(height: SentinelSpacing.md),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: SentinelSpacing.md,
            mainAxisSpacing: SentinelSpacing.md,
            childAspectRatio: 1.5,
          ),
          itemCount: domains.length,
          itemBuilder: (context, index) {
            final d = domains[index];
            final bool isWarning = d.status == 'WARNING';
            
            return InkWell(
              onTap: () {
                if (d.title == 'Identity') context.go(SentinelRoutes.identity);
                else if (d.title == 'AppSec') context.go(SentinelRoutes.appsec);
                else if (d.title == 'InfraSec') context.go(SentinelRoutes.infrastructure);
                else if (d.title == 'AISec') context.go(SentinelRoutes.aiSecurity);
                else if (d.title == 'DevSecOps') context.go(SentinelRoutes.devsecops);
                else if (d.title == 'Security Events') context.go(SentinelRoutes.securityEvents);
              },
              borderRadius: BorderRadius.circular(SentinelRadii.md),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isWarning ? SentinelColors.blocked.withValues(alpha: 0.05) : Colors.white.withValues(alpha: 0.03),
                  borderRadius: BorderRadius.circular(SentinelRadii.md),
                  border: Border.all(
                    color: isWarning ? SentinelColors.blocked.withValues(alpha: 0.3) : SentinelColors.border.withValues(alpha: 0.5),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: isWarning ? SentinelColors.blocked.withValues(alpha: 0.2) : SentinelColors.primaryGlow.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(d.icon, size: 16, color: isWarning ? SentinelColors.blocked : SentinelColors.primaryGlow),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: isWarning ? SentinelColors.blocked.withValues(alpha: 0.1) : SentinelColors.healthy.withValues(alpha: 0.1),
                            border: Border.all(color: isWarning ? SentinelColors.blocked.withValues(alpha: 0.3) : SentinelColors.healthy.withValues(alpha: 0.2)),
                            borderRadius: BorderRadius.circular(SentinelRadii.pill),
                          ),
                          child: Text(
                            d.status,
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: isWarning ? SentinelColors.blocked : SentinelColors.healthy,
                            ),
                          ),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(d.title, style: SentinelTextStyles.bodyMd.copyWith(color: isWarning ? SentinelColors.blocked : SentinelColors.textPrimary)),
                        Text(d.subtitle, style: SentinelTextStyles.labelSm, overflow: TextOverflow.ellipsis),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildRecentFindingsSection(BuildContext context, List<_MockFinding> findings) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            const Text('Recent Findings', style: SentinelTextStyles.headlineMd),
            InkWell(
              onTap: () {}, // context.go(SentinelRoutes.findings) removed
              child: Text('View All', style: SentinelTextStyles.labelSm.copyWith(color: SentinelColors.primary)),
            ),
          ],
        ),
        const SizedBox(height: SentinelSpacing.md),
        Column(
          children: findings.map((f) {
            final isCritical = f.severity == 'Critical';
            final color = isCritical ? SentinelColors.blocked : SentinelColors.degraded;
            
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: SentinelColors.surfaceHigh.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(SentinelRadii.md),
                border: Border(left: BorderSide(color: color, width: 2)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(f.icon, color: color, size: 16),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(f.title, style: SentinelTextStyles.bodyMd.copyWith(fontWeight: FontWeight.bold)),
                        Text(f.subtitle, style: SentinelTextStyles.labelSm),
                      ],
                    ),
                  ),
                  Text(f.time, style: SentinelTextStyles.labelSm),
                ],
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildScanButton() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        boxShadow: [
          BoxShadow(
            color: SentinelColors.primaryGlow.withValues(alpha: 0.4),
            blurRadius: 8,
          )
        ],
      ),
      child: ElevatedButton(
        onPressed: () {},
        style: ElevatedButton.styleFrom(
          backgroundColor: SentinelColors.primaryGlow,
          foregroundColor: SentinelColors.background,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(SentinelRadii.pill)),
        ),
        child: Text(
          'RUN FULL SECURITY SCAN',
          style: SentinelTextStyles.labelCaps.copyWith(color: SentinelColors.background, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}

// ── Mock Data to Match Stitch ──────────────────────────────────────────────────
class _MockDashboardData {
  final int systemHealthScore;
  final List<_MockDomain> domains;
  final List<_MockFinding> findings;
  _MockDashboardData(this.systemHealthScore, this.domains, this.findings);
}

class _MockDomain {
  final String title;
  final String subtitle;
  final String status;
  final IconData icon;
  _MockDomain(this.title, this.subtitle, this.status, this.icon);
}

class _MockFinding {
  final String title;
  final String subtitle;
  final String time;
  final String severity;
  final IconData icon;
  _MockFinding(this.title, this.subtitle, this.time, this.severity, this.icon);
}

_MockDashboardData _getMockStitchData() {
  return _MockDashboardData(
    96,
    [
      _MockDomain('Identity', 'Access secure', 'HEALTHY', Icons.fingerprint),
      _MockDomain('AppSec', 'No vulnerabilities', 'HEALTHY', Icons.code),
      _MockDomain('InfraSec', 'Traffic anomaly', 'WARNING', Icons.cloud_outlined),
      _MockDomain('AISec', 'Models verified', 'HEALTHY', Icons.psychology),
      _MockDomain('DevSecOps', 'Pipelines secure', 'HEALTHY', Icons.all_inclusive),
      _MockDomain('Security Events', 'Active Findings', 'WARNING', Icons.security),
    ],
    [
      _MockFinding('Unauthorized IAM role assumption', 'Detected on Production Cluster', '2m ago', 'Critical', Icons.warning),
      _MockFinding('Unusual outbound traffic spike', 'Gateway node us-east-1', '14m ago', 'High', Icons.insights),
    ],
  );
}
