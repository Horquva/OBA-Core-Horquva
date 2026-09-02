import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../_ui/theme/sentinel_colors.dart';
import '../_ui/theme/sentinel_spacing.dart';
import '../_ui/theme/sentinel_radii.dart';

/// InfraSec Domain Drill-down Screen
/// Owner: Muhammad Anas (Experience Layer)
class InfrastructureScreen extends StatelessWidget {
  const InfrastructureScreen({super.key});

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
            const SizedBox(height: SentinelSpacing.sm),
            _buildSectionHeader(Icons.account_tree_outlined, 'WORKLOADS & SERVICES'),
            const SizedBox(height: SentinelSpacing.md),
            _buildWorkloadsCard(),
            const SizedBox(height: SentinelSpacing.xl),
            
            _buildSectionHeader(Icons.history, 'RECENT EVENTS'),
            const SizedBox(height: SentinelSpacing.md),
            _buildEventsCard(),
            const SizedBox(height: 100), // Padding for bottom nav
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
          const Icon(Icons.dns, color: Colors.lightBlueAccent, size: 24),
          const SizedBox(width: 8),
          const Text('Infrastructure', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
        ],
      ),
      centerTitle: false,
      actions: [
        Container(
          margin: const EdgeInsets.only(right: 16),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.redAccent.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(SentinelRadii.pill),
            border: Border.all(color: Colors.redAccent.withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              const Icon(Icons.circle, color: Colors.redAccent, size: 8),
              const SizedBox(width: 6),
              const Text('CRITICAL', style: TextStyle(color: Colors.redAccent, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSectionHeader(IconData icon, String title) {
    return Row(
      children: [
        Icon(icon, color: Colors.lightBlueAccent, size: 16),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            color: Colors.lightBlueAccent,
            fontSize: 12,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
          ),
        ),
      ],
    );
  }

  Widget _buildWorkloadsCard() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B),
        borderRadius: BorderRadius.circular(SentinelRadii.lg),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        children: [
          _buildWorkloadRow(Icons.dashboard_customize_outlined, 'api-gateway', 'OPERATIONAL', Colors.lightBlueAccent),
          Container(height: 1, color: Colors.white10),
          _buildWorkloadRow(Icons.vpn_key_outlined, 'auth-service', 'DEGRADED', Colors.purpleAccent),
          Container(height: 1, color: Colors.white10),
          _buildWorkloadRow(Icons.account_balance_wallet_outlined, 'payment-worker', 'UNAVAILABLE', Colors.grey),
          Container(height: 1, color: Colors.white10),
          _buildWorkloadRow(Icons.format_strikethrough, 'log-pipeline', 'BLOCKED', Colors.red[300]!),
          Container(height: 1, color: Colors.white10),
          _buildWorkloadRow(Icons.storage, 'db-cluster', 'UNKNOWN', Colors.grey, isDashed: true),
        ],
      ),
    );
  }

  Widget _buildWorkloadRow(IconData icon, String title, String status, Color statusColor, {bool isDashed = false}) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Icon(icon, color: Colors.white54, size: 20),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.bold,
                fontFamily: 'monospace',
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: isDashed 
              ? BoxDecoration(
                  borderRadius: BorderRadius.circular(SentinelRadii.pill),
                  // Mock dashed border by just using a lighter solid border for now in standard Container
                  // Custom painter would be needed for true dashed border, but a solid subtle border is close enough
                  border: Border.all(color: Colors.white24, style: BorderStyle.solid),
                )
              : BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(SentinelRadii.pill),
                  border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                ),
            child: Row(
              children: [
                if (status == 'UNKNOWN')
                  const Padding(
                    padding: EdgeInsets.only(right: 6),
                    child: Icon(Icons.help_outline, color: Colors.grey, size: 10),
                  )
                else
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: Icon(Icons.circle, color: statusColor, size: 8),
                  ),
                Text(
                  status,
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
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
          _buildEventRow(Icons.autorenew, Colors.lightBlueAccent, 'Node restart detected', 'db-cluster-01', '10:42 AM'),
          _buildEventRow(Icons.block, Colors.red[300]!, 'Ingress traffic blocked', 'log-pipeline', '10:15 AM'),
          _buildEventRow(Icons.speed, Colors.purpleAccent, 'High latency detected', 'auth-service', '09:58 AM'),
        ],
      ),
    );
  }

  Widget _buildEventRow(IconData icon, Color iconColor, String title, String tag, String time) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(top: 2),
            child: Icon(icon, color: iconColor, size: 18),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(SentinelRadii.pill),
                    border: Border.all(color: Colors.white10),
                  ),
                  child: Text(
                    tag, 
                    style: const TextStyle(color: Colors.white70, fontSize: 10, fontFamily: 'monospace'),
                  ),
                ),
              ],
            ),
          ),
          Text(time, style: const TextStyle(color: Colors.white54, fontSize: 11)),
        ],
      ),
    );
  }
}
