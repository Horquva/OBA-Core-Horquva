import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../_ui/theme/sentinel_colors.dart';
import '../_ui/theme/sentinel_spacing.dart';
import '../_ui/theme/sentinel_text_styles.dart';
import '../_ui/theme/sentinel_radii.dart';

/// Identity Domain Drill-down Screen
/// Owner: Muhammad Anas (Experience Layer)
class IdentityScreen extends StatelessWidget {
  const IdentityScreen({super.key});

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
            _buildAuthStateCard(),
            const SizedBox(height: SentinelSpacing.md),
            _buildStatusItem(Icons.security_outlined, 'MFA Status', 'Enabled'),
            const SizedBox(height: SentinelSpacing.sm),
            _buildStatusItem(Icons.access_time_outlined, 'Last Verified', '2h ago'),
            const SizedBox(height: SentinelSpacing.sm),
            _buildStatusItem(Icons.circle, 'Risk Signal', 'Low', iconColor: Colors.greenAccent, iconSize: 12),
            const SizedBox(height: SentinelSpacing.xl),
            const Text('Active Sessions', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: SentinelSpacing.md),
            _buildSessionsCard(),
            const SizedBox(height: SentinelSpacing.xl),
            const Text('Authorization Decisions', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: SentinelSpacing.md),
            _buildDecisionsCard(),
            const SizedBox(height: SentinelSpacing.lg),
            _buildViewLogButton(),
            const SizedBox(height: 100), // Bottom nav padding
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
        icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
        onPressed: () => context.pop(),
      ),
      title: Row(
        children: [
          const Icon(Icons.fingerprint, color: Color(0xFF8C9EFF), size: 24),
          const SizedBox(width: 8),
          const Text('Identity', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
        ],
      ),
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
              const Text('HEALTHY', style: TextStyle(color: Colors.greenAccent, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAuthStateCard() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 24),
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B),
        borderRadius: BorderRadius.circular(SentinelRadii.lg),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        children: [
          Text(
            'Authentication State',
            style: TextStyle(color: SentinelColors.textSecondary, fontSize: 12, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.circle, color: Colors.greenAccent, size: 8),
              const SizedBox(width: 4),
              const Icon(Icons.circle, color: Colors.greenAccent, size: 8),
              const SizedBox(width: 12),
              Text(
                'AUTHENTICATED',
                style: TextStyle(
                  color: Colors.greenAccent,
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.5,
                  shadows: [
                    Shadow(color: Colors.greenAccent.withValues(alpha: 0.5), blurRadius: 10),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusItem(IconData icon, String title, String value, {Color iconColor = SentinelColors.textSecondary, double iconSize = 20}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B),
        borderRadius: BorderRadius.circular(SentinelRadii.lg),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.05),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: iconColor, size: iconSize),
          ),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: TextStyle(color: SentinelColors.textSecondary, fontSize: 11, fontWeight: FontWeight.bold)),
              const SizedBox(height: 2),
              Text(value, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSessionsCard() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B),
        borderRadius: BorderRadius.circular(SentinelRadii.lg),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        children: [
          _buildSessionRow(Icons.laptop, 'Session — Chrome / Karachi, PK', 'Last active 4 mins ago • IP: 192.168.1.1', true),
          Container(height: 1, color: Colors.white10),
          _buildSessionRow(Icons.smartphone, 'Session — Safari / Dubai, UAE', 'Last active 2 days ago • IP: 10.0.0.5', false),
        ],
      ),
    );
  }

  Widget _buildSessionRow(IconData icon, String title, String subtitle, bool isActive) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.05),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: SentinelColors.textSecondary, size: 20),
          ),
          const SizedBox(width: 16),
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
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: isActive ? Colors.green.withValues(alpha: 0.1) : Colors.white10,
              borderRadius: BorderRadius.circular(SentinelRadii.pill),
              border: Border.all(color: isActive ? Colors.green.withValues(alpha: 0.3) : Colors.white24),
            ),
            child: Row(
              children: [
                Icon(Icons.circle, color: isActive ? Colors.greenAccent : Colors.grey, size: 6),
                const SizedBox(width: 4),
                Text(
                  isActive ? 'Active' : 'Inactive',
                  style: TextStyle(color: isActive ? Colors.greenAccent : Colors.grey, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDecisionsCard() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B),
        borderRadius: BorderRadius.circular(SentinelRadii.lg),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        children: [
          _buildDecisionRow('ALLOW', Colors.greenAccent, '/v1/users/export', '10:42:05 AM'),
          Container(height: 1, color: Colors.white10),
          _buildDecisionRow('ALLOW', Colors.greenAccent, '/v1/policies/read', '10:35:12 AM'),
          Container(height: 1, color: Colors.white10),
          _buildDecisionRow('DENIED', Colors.redAccent, '/admin/settings/write', '09:15:44 AM'),
        ],
      ),
    );
  }

  Widget _buildDecisionRow(String status, Color statusColor, String path, String time) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(SentinelRadii.pill),
              border: Border.all(color: statusColor.withValues(alpha: 0.3)),
            ),
            child: Text(
              status,
              style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.5),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              path,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.bold,
                fontFamily: 'monospace', // Mocking the code-like font in the image
              ),
            ),
          ),
          Text(time, style: const TextStyle(color: Colors.white54, fontSize: 11, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildViewLogButton() {
    return Container(
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
            'VIEW FULL IDENTITY LOG',
            style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1),
          ),
          const SizedBox(width: 8),
          const Icon(Icons.arrow_forward_ios, color: Colors.white54, size: 12),
        ],
      ),
    );
  }
}
