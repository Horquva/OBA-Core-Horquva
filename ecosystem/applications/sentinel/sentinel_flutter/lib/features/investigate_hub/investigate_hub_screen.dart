import 'package:flutter/material.dart';
import '../_ui/theme/sentinel_colors.dart';
import '../_ui/theme/sentinel_spacing.dart';
import '../_ui/theme/sentinel_radii.dart';

/// Investigate Hub (1:1 Stitch Reference)
/// Owner: Muhammad Anas (Experience Layer)
class InvestigateHubScreen extends StatelessWidget {
  const InvestigateHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent, // Background handled by Shell
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(SentinelSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildHeader(),
              const SizedBox(height: SentinelSpacing.xl),
              _buildDomainNav(),
              const SizedBox(height: SentinelSpacing.xl),
              _buildLiveThreatFeed(),
              const SizedBox(height: SentinelSpacing.xl),
              _buildSecurityTimeline(),
              const SizedBox(height: SentinelSpacing.xl),
              _buildSystemHealth(),
              const SizedBox(height: 100), // Bottom padding for FAB
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            const CircleAvatar(
              radius: 20,
              backgroundColor: SentinelColors.surfaceHigh,
              child: Icon(Icons.person, color: SentinelColors.textSecondary),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Welcome back,', style: TextStyle(color: SentinelColors.textSecondary, fontSize: 12)),
                Row(
                  children: const [
                    Text('Mustafa Babar ', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                    Text('👋', style: TextStyle(fontSize: 16)),
                  ],
                ),
                const Text('SUPER ADMIN', style: TextStyle(color: SentinelColors.textSecondary, fontSize: 10, letterSpacing: 1.5)),
              ],
            ),
          ],
        ),
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFF161B26), // Slightly lighter dark
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white10),
          ),
          child: Stack(
            children: [
              const Icon(Icons.notifications_none, color: SentinelColors.textSecondary, size: 24),
              Positioned(
                right: 2,
                top: 2,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Colors.redAccent,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDomainNav() {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth > 600) {
          // Stretch evenly on wide screens
          return Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildDomainItem(Icons.fingerprint, 'Identity', const Color(0xFF1976D2)),
              _buildDomainItem(Icons.admin_panel_settings, 'AppSec', const Color(0xFF9C27B0)),
              _buildDomainItem(Icons.cloud_outlined, 'InfraSec', const Color(0xFFFF9800)),
              _buildDomainItem(Icons.psychology, 'AISec', const Color(0xFF4CAF50)),
              _buildDomainItem(Icons.all_inclusive, 'DevSecOps', const Color(0xFF00BCD4)),
              _buildDomainItem(Icons.more_horiz, 'More', Colors.grey),
            ],
          );
        } else {
          // Responsive Wrap (Centered)
          return SizedBox(
            width: double.infinity,
            child: Wrap(
              alignment: WrapAlignment.center,
              spacing: 12,
              runSpacing: 12,
              children: [
                _buildDomainItem(Icons.fingerprint, 'Identity', const Color(0xFF1976D2)),
                _buildDomainItem(Icons.admin_panel_settings, 'AppSec', const Color(0xFF9C27B0)),
                _buildDomainItem(Icons.cloud_outlined, 'InfraSec', const Color(0xFFFF9800)),
                _buildDomainItem(Icons.psychology, 'AISec', const Color(0xFF4CAF50)),
                _buildDomainItem(Icons.all_inclusive, 'DevSecOps', const Color(0xFF00BCD4)),
                _buildDomainItem(Icons.more_horiz, 'More', Colors.grey),
              ],
            ),
          );
        }
      },
    );
  }

  Widget _buildDomainItem(IconData icon, String label, Color color) {
    return Column(
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: const Color(0xFF161B26),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: color.withValues(alpha: 0.3), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: color.withValues(alpha: 0.1),
                blurRadius: 10,
              ),
            ],
          ),
          child: Icon(icon, color: color, size: 28),
        ),
        const SizedBox(height: 8),
        Text(label, style: const TextStyle(color: SentinelColors.textSecondary, fontSize: 11, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildLiveThreatFeed() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B),
        borderRadius: BorderRadius.circular(SentinelRadii.lg),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.show_chart, color: SentinelColors.primaryGlow, size: 20),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text('Live Threat Feed', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                      Text('Real-time Security Events', style: TextStyle(color: SentinelColors.textSecondary, fontSize: 11)),
                    ],
                  ),
                ],
              ),
              Row(
                children: const [
                  Text('View All', style: TextStyle(color: SentinelColors.primaryGlow, fontSize: 12, fontWeight: FontWeight.bold)),
                  SizedBox(width: 4),
                  Icon(Icons.arrow_forward, color: SentinelColors.primaryGlow, size: 16),
                ],
              ),
            ],
          ),
          const SizedBox(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              // Radar Animation mock
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: SentinelColors.primaryGlow.withValues(alpha: 0.1), width: 1),
                ),
                child: Center(
                  child: Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: SentinelColors.primaryGlow.withValues(alpha: 0.3), width: 1),
                    ),
                    child: Center(
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: const Color(0xFF161B26),
                          border: Border.all(color: SentinelColors.primaryGlow.withValues(alpha: 0.5)),
                          boxShadow: [
                            BoxShadow(color: SentinelColors.primaryGlow.withValues(alpha: 0.2), blurRadius: 10),
                          ],
                        ),
                        child: const Icon(Icons.security, color: Colors.orangeAccent, size: 20),
                      ),
                    ),
                  ),
                ),
              ),
              Container(width: 1, height: 100, color: Colors.white10),
              // Stats
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildThreatStat(Icons.warning_amber_rounded, '142', 'Threats Detected', Colors.redAccent),
                  const SizedBox(height: 12),
                  _buildThreatStat(Icons.block, '24', 'Blocked', Colors.orangeAccent),
                  const SizedBox(height: 12),
                  _buildThreatStat(Icons.visibility, '118', 'Monitored', const Color(0xFF1976D2)),
                  const SizedBox(height: 12),
                  _buildThreatStat(Icons.check_circle_outline, '0', 'Unresolved', Colors.green),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildThreatStat(IconData icon, String count, String label, Color color) {
    return Row(
      children: [
        Icon(icon, color: color, size: 16),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(count, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            Text(label, style: const TextStyle(color: SentinelColors.textSecondary, fontSize: 10)),
          ],
        ),
      ],
    );
  }

  Widget _buildSecurityTimeline() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B),
        borderRadius: BorderRadius.circular(SentinelRadii.lg),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Security Timeline', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              Row(
                children: const [
                  Text('24 Hours', style: TextStyle(color: SentinelColors.textSecondary, fontSize: 12)),
                  Icon(Icons.keyboard_arrow_down, color: SentinelColors.textSecondary, size: 16),
                ],
              ),
            ],
          ),
          const SizedBox(height: 32),
          // Timeline Row
          LayoutBuilder(
            builder: (context, constraints) {
              if (constraints.maxWidth > 600) {
                // Desktop: Expand lines to fill width evenly
                return Row(
                  children: [
                    _buildTimelineNode(Icons.person_outline, 'User Login', 'Success', '8:45 AM', Colors.green),
                    _buildExpandedTimelineLine(),
                    _buildTimelineNode(Icons.shield_outlined, 'Policy Change', 'High Impact', '9:15 AM', Colors.orange),
                    _buildExpandedTimelineLine(),
                    _buildTimelineNode(Icons.cancel_outlined, 'Malicious IP', 'Blocked', '9:42 AM', Colors.redAccent),
                    _buildExpandedTimelineLine(),
                    _buildTimelineNode(Icons.security, 'Anomaly\nDetected', 'AI Engine', '10:05 AM', const Color(0xFF1976D2)),
                    _buildExpandedTimelineLine(),
                    _buildTimelineNode(Icons.verified_user_outlined, 'Threat\nNeutralized', 'Auto Contained', '10:28 AM', SentinelColors.primaryGlow),
                  ],
                );
              } else {
                // Mobile: Scroll horizontally
                return SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildTimelineNode(Icons.person_outline, 'User Login', 'Success', '8:45 AM', Colors.green),
                      _buildTimelineLine(),
                      _buildTimelineNode(Icons.shield_outlined, 'Policy Change', 'High Impact', '9:15 AM', Colors.orange),
                      _buildTimelineLine(),
                      _buildTimelineNode(Icons.cancel_outlined, 'Malicious IP', 'Blocked', '9:42 AM', Colors.redAccent),
                      _buildTimelineLine(),
                      _buildTimelineNode(Icons.security, 'Anomaly\nDetected', 'AI Engine', '10:05 AM', const Color(0xFF1976D2)),
                      _buildTimelineLine(),
                      _buildTimelineNode(Icons.verified_user_outlined, 'Threat\nNeutralized', 'Auto Contained', '10:28 AM', SentinelColors.primaryGlow),
                    ],
                  ),
                );
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildExpandedTimelineLine() {
    return Expanded(
      child: Container(
        height: 1,
        color: Colors.white24,
        margin: const EdgeInsets.only(bottom: 30), // Align with icons
      ),
    );
  }

  Widget _buildTimelineLine() {
    return Container(
      width: 40,
      height: 1,
      color: Colors.white24,
      margin: const EdgeInsets.only(bottom: 30), // Align with icons
    );
  }

  Widget _buildTimelineNode(IconData icon, String title, String subtitle, String time, Color color) {
    return Column(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: color, width: 1.5),
            color: const Color(0xFF161B26),
            boxShadow: [
              BoxShadow(color: color.withValues(alpha: 0.2), blurRadius: 8),
            ],
          ),
          child: Icon(icon, color: color, size: 16),
        ),
        const SizedBox(height: 8),
        Text(title, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(subtitle, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(time, style: const TextStyle(color: SentinelColors.textSecondary, fontSize: 9)),
      ],
    );
  }

  Widget _buildSystemHealth() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B),
        borderRadius: BorderRadius.circular(SentinelRadii.lg),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('System Health', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              Text('All Systems Operational', style: TextStyle(color: SentinelColors.textSecondary, fontSize: 12)),
              Text('28/28', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            height: 6,
            width: double.infinity,
            decoration: BoxDecoration(
              color: SentinelColors.primaryGlow,
              borderRadius: BorderRadius.circular(3),
              boxShadow: [
                BoxShadow(color: SentinelColors.primaryGlow.withValues(alpha: 0.5), blurRadius: 10),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
