import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../_ui/theme/sentinel_colors.dart';
import '../_ui/theme/sentinel_spacing.dart';
import '../_ui/theme/sentinel_text_styles.dart';
import '../_ui/theme/sentinel_radii.dart';

/// AppSec Domain Drill-down Screen
/// Owner: Muhammad Anas (Experience Layer)
class AppsecScreen extends StatelessWidget {
  const AppsecScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: _buildAppBar(context),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: SentinelSpacing.md, vertical: SentinelSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildStatsRow(context),
            const SizedBox(height: SentinelSpacing.xl),
            
            Text('RECENT SECURITY EVENTS', style: SentinelTextStyles.labelCaps.copyWith(color: SentinelColors.textSecondary)),
            const SizedBox(height: SentinelSpacing.sm),
            _buildEventsCard(),
            const SizedBox(height: SentinelSpacing.xl),
            
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('FINDINGS', style: SentinelTextStyles.labelCaps.copyWith(color: SentinelColors.textSecondary)),
                Row(
                  children: [
                    Text('View All', style: TextStyle(color: SentinelColors.primaryGlow, fontSize: 12, fontWeight: FontWeight.bold)),
                    const Icon(Icons.chevron_right, color: SentinelColors.primaryGlow, size: 16),
                  ],
                ),
              ],
            ),
            const SizedBox(height: SentinelSpacing.sm),
            _buildFindingsCard(),
            const SizedBox(height: SentinelSpacing.lg),
            
            _buildViewAllButton(),
            const SizedBox(height: 100), // padding for bottom nav
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 18),
        onPressed: () => context.pop(),
      ),
      title: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.code, color: Color(0xFFD0BCFF), size: 24),
          const SizedBox(width: 8),
          const Text('Application Security', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold, fontFamily: 'Space Grotesk')),
        ],
      ),
      centerTitle: true,
      actions: [
        Container(
          margin: const EdgeInsets.only(right: 16),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.greenAccent.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(SentinelRadii.pill),
            border: Border.all(color: Colors.greenAccent.withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              const Icon(Icons.circle, color: Colors.greenAccent, size: 8),
              const SizedBox(width: 6),
              const Text('ACTIVE', style: TextStyle(color: Colors.greenAccent, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatsRow(BuildContext context) {
    return Row(
      children: [
        Expanded(child: _buildStatCard('ALLOW', '214', Icons.check_circle, Colors.lightBlueAccent, Colors.lightBlueAccent)),
        const SizedBox(width: 8),
        Expanded(child: _buildStatCard('BLOCK', '18', Icons.block, Colors.redAccent, Colors.redAccent)),
        const SizedBox(width: 8),
        Expanded(child: _buildStatCard('REQUIRE\nCONTROL', '4', Icons.security_update_warning, Colors.purpleAccent, Colors.purpleAccent)),
        const SizedBox(width: 8),
        Expanded(child: _buildStatCard('ESCALATE', '1', Icons.warning_rounded, Colors.red, Colors.red)),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color iconColor, Color valueColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B),
        borderRadius: BorderRadius.circular(SentinelRadii.md),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  title, 
                  style: TextStyle(color: SentinelColors.textSecondary, fontSize: 8, fontWeight: FontWeight.bold, height: 1.1),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 2),
              Icon(icon, color: iconColor, size: 12),
            ],
          ),
          const SizedBox(height: 12),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(value, style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildEventsCard() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B),
        borderRadius: BorderRadius.circular(SentinelRadii.lg),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        children: [
          _buildEventRow('/api/checkout — SQL pattern', 'Source: 192.168.1.104', '2m ago', Colors.red[300]!),
          Container(height: 1, color: Colors.white10),
          _buildEventRow('/user/profile — Rate Limit', 'Source: 10.0.4.22', '15m ago', Colors.purpleAccent),
          Container(height: 1, color: Colors.white10),
          _buildEventRow('/admin/config — Auth Bypass', 'Source: Unknown', '1h ago', Colors.redAccent),
        ],
      ),
    );
  }

  Widget _buildEventRow(String title, String subtitle, String time, Color indicatorColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 4,
            height: 24,
            margin: const EdgeInsets.only(left: 16, right: 12, top: 4),
            decoration: BoxDecoration(
              color: indicatorColor,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(subtitle, style: TextStyle(color: SentinelColors.textSecondary, fontSize: 11)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Text(time, style: TextStyle(color: SentinelColors.textSecondary, fontSize: 11)),
          ),
        ],
      ),
    );
  }

  Widget _buildFindingsCard() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B),
        borderRadius: BorderRadius.circular(SentinelRadii.lg),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        children: [
          _buildFindingRow('Improper Input Validation', 'CWE-89', 'Today', Colors.red[300]!),
          Container(height: 1, color: Colors.white10),
          _buildFindingRow('Cross-Site Scripting', 'CWE-79', 'Yesterday', Colors.purpleAccent),
          Container(height: 1, color: Colors.white10),
          _buildFindingRow('Exposure of Sensitive Info', 'CWE-200', 'Oct 12', Colors.lightBlueAccent),
        ],
      ),
    );
  }

  Widget _buildFindingRow(String title, String cwe, String time, Color dotColor) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Icon(Icons.circle, color: dotColor, size: 8),
          const SizedBox(width: 12),
          Text(title, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(SentinelRadii.pill),
              border: Border.all(color: Colors.white10),
            ),
            child: Text(cwe, style: TextStyle(color: SentinelColors.textSecondary, fontSize: 9, fontWeight: FontWeight.bold)),
          ),
          const Spacer(),
          Text(time, style: TextStyle(color: SentinelColors.textSecondary, fontSize: 11)),
        ],
      ),
    );
  }

  Widget _buildViewAllButton() {
    return InkWell(
      onTap: () {},
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: const Color(0xFF0D121B),
          borderRadius: BorderRadius.circular(SentinelRadii.md),
          border: Border.all(color: Colors.white10),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'VIEW ALL APPSEC EVENTS',
              style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.arrow_forward_ios, color: Colors.white54, size: 12),
          ],
        ),
      ),
    );
  }
}
