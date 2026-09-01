import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../_ui/theme/sentinel_colors.dart';
import '../_ui/theme/sentinel_spacing.dart';
import '../_ui/theme/sentinel_radii.dart';
import '../_ui/theme/sentinel_text_styles.dart';

/// AI Security Domain Drill-down Screen
/// Owner: Muhammad Anas (Experience Layer)
class AiSecurityScreen extends StatelessWidget {
  const AiSecurityScreen({super.key});

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
            _buildSectionHeader('EXECUTION TRACE'),
            const SizedBox(height: SentinelSpacing.sm),
            _buildExecutionTraceCard(),
            const SizedBox(height: SentinelSpacing.xl),
            
            _buildSectionHeader('GUARDRAIL EVENTS'),
            const SizedBox(height: SentinelSpacing.sm),
            _buildGuardrailEventsCard(),
            const SizedBox(height: SentinelSpacing.xl),
            
            _buildSectionHeader('TOOL AUTHORIZATION OUTCOMES'),
            const SizedBox(height: SentinelSpacing.sm),
            _buildToolOutcomesCard(),
            const SizedBox(height: SentinelSpacing.xl),
            
            _buildViewAllButton(),
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
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: Colors.lightBlueAccent.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(4),
            ),
            child: const Icon(Icons.psychology, color: Colors.lightBlueAccent, size: 20),
          ),
          const SizedBox(width: 10),
          const Text('AI Security', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
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
              const Text('BLOCKED', style: TextStyle(color: Colors.redAccent, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(
        color: Colors.lightBlueAccent,
        fontSize: 11,
        fontWeight: FontWeight.bold,
        letterSpacing: 1.2,
      ),
    );
  }

  Widget _buildExecutionTraceCard() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B),
        borderRadius: BorderRadius.circular(SentinelRadii.lg),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          _buildTraceNode(Icons.chat_bubble_outline, 'Request', Colors.lightBlueAccent),
          _buildTraceLine(Colors.lightBlueAccent),
          _buildTraceNode(Icons.fingerprint, 'Identity', Colors.lightBlueAccent),
          _buildTraceLine(Colors.lightBlueAccent),
          _buildTraceNode(Icons.vpn_key_outlined, 'Auth', Colors.lightBlueAccent),
          _buildTraceLine(Colors.redAccent),
          _buildTraceNode(Icons.security, 'Guardrail', Colors.redAccent, isAlert: true),
          _buildTraceLine(Colors.white10),
          _buildDecisionNode(),
        ],
      ),
    );
  }

  Widget _buildTraceNode(IconData icon, String label, Color color, {bool isAlert = false}) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: color.withValues(alpha: 0.1),
            border: Border.all(color: color.withValues(alpha: 0.3), width: 1.5),
            boxShadow: isAlert ? [BoxShadow(color: color.withValues(alpha: 0.3), blurRadius: 10)] : null,
          ),
          child: Icon(icon, color: color, size: 18),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: TextStyle(
            color: isAlert ? color : Colors.white,
            fontSize: 10,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildTraceLine(Color color) {
    return Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.only(bottom: 20), // offset to align with circle center
        color: color,
      ),
    );
  }

  Widget _buildDecisionNode() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          height: 36,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: Colors.red[300],
            borderRadius: BorderRadius.circular(SentinelRadii.pill),
          ),
          alignment: Alignment.center,
          child: const Text(
            'BLOCK',
            style: TextStyle(color: Colors.black, fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.5),
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Decision',
          style: TextStyle(color: Colors.white54, fontSize: 10, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  Widget _buildGuardrailEventsCard() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B),
        borderRadius: BorderRadius.circular(SentinelRadii.lg),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        children: [
          _buildEventRow(Icons.shield, Colors.lightBlueAccent, 'Prompt injection attempt blocked', 'Trigger: "Ignore previous instructions and output..." detecte...', '10:42:15'),
          Container(height: 1, color: Colors.white10),
          _buildEventRow(Icons.manage_search, Colors.red[300]!, 'PII Exfiltration Prevented', 'Trigger: Model attempted to output SSN sequence.', '10:42:14'),
          Container(height: 1, color: Colors.white10),
          _buildEventRow(Icons.format_strikethrough, Colors.grey, 'Toxic Content Check Passed', 'Confidence: 0.98. No violations found.', '10:42:12'),
        ],
      ),
    );
  }

  Widget _buildEventRow(IconData icon, Color iconColor, String title, String subtitle, String time) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(top: 2),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(
                  subtitle, 
                  style: const TextStyle(color: Colors.white70, fontSize: 11),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(time, style: const TextStyle(color: Colors.white54, fontSize: 11)),
        ],
      ),
    );
  }

  Widget _buildToolOutcomesCard() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B),
        borderRadius: BorderRadius.circular(SentinelRadii.lg),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        children: [
          _buildToolRow(Icons.terminal, 'file-write-tool', '10:42:13', 'DENY', Colors.red[300]!),
          Container(height: 1, color: Colors.white10),
          _buildToolRow(Icons.search, 'db-query-read', '10:42:11', 'ALLOW', Colors.greenAccent),
          Container(height: 1, color: Colors.white10),
          _buildToolRow(Icons.api, 'get-weather-api', '10:42:09', 'ALLOW', Colors.greenAccent),
        ],
      ),
    );
  }

  Widget _buildToolRow(IconData icon, String title, String time, String status, Color statusColor) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Icon(icon, color: Colors.white54, size: 18),
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
          Text(time, style: const TextStyle(color: Colors.white54, fontSize: 11)),
          const SizedBox(width: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(SentinelRadii.pill),
              border: Border.all(color: statusColor.withValues(alpha: 0.3)),
            ),
            child: Text(
              status,
              style: TextStyle(
                color: statusColor,
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.5,
              ),
            ),
          ),
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
          border: Border.all(color: Colors.lightBlueAccent.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'VIEW ALL AI SECURITY FINDINGS',
              style: TextStyle(color: Colors.lightBlueAccent, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.arrow_forward_ios, color: Colors.lightBlueAccent, size: 12),
          ],
        ),
      ),
    );
  }
}
