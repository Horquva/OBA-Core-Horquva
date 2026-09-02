import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../_ui/theme/sentinel_radii.dart';
import '../_ui/theme/sentinel_spacing.dart';

/// Security Events / Findings Screen (1:1 Stitch Reference)
/// Owner: Muhammad Anas (Experience Layer)
class SecurityEventsScreen extends StatelessWidget {
  const SecurityEventsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF05070D),
      appBar: _buildAppBar(context),
      body: Column(
        children: [
          _buildTabs(),
          const SizedBox(height: SentinelSpacing.md),
          Expanded(
            child: _buildFindingsList(),
          ),
        ],
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
      title: const Text('Findings', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
      centerTitle: true,
      actions: [
        IconButton(
          icon: const Icon(Icons.filter_list, color: Colors.white54),
          onPressed: () {},
        ),
      ],
    );
  }

  Widget _buildTabs() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          _buildTab('OPEN', isSelected: true),
          _buildTab('TRIAGED'),
          _buildTab('ASSIGNED'),
          _buildTab('REMEDIATION'),
          _buildTab('RETEST'),
          _buildTab('VERIFIED'),
        ],
      ),
    );
  }

  Widget _buildTab(String title, {bool isSelected = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: isSelected ? Colors.cyanAccent.withValues(alpha: 0.1) : Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(SentinelRadii.pill),
        border: Border.all(color: isSelected ? Colors.cyanAccent : Colors.white24),
      ),
      child: Text(
        title,
        style: TextStyle(
          color: isSelected ? Colors.cyanAccent : Colors.white54,
          fontSize: 10,
          fontWeight: FontWeight.bold,
          letterSpacing: 1,
        ),
      ),
    );
  }

  Widget _buildFindingsList() {
    return ListView(
      padding: const EdgeInsets.only(left: 16, right: 16, bottom: 120, top: 8),
      children: [
        _buildFindingCard('SQL Injection in Login Payload', 'Owner: Alice Chen • Affected: Auth Service', 'OPEN', Colors.red[300]!, Colors.redAccent),
        const SizedBox(height: 8),
        _buildFindingCard('Exposed S3 Bucket - Customer Data', 'Owner: DevOps Team • Affected: Storage', 'ASSIGNED', Colors.orange, Colors.lightBlueAccent),
        const SizedBox(height: 8),
        _buildFindingCard('RCE via Deserialization Vulnerability', 'Owner: Bob Smith • Affected: Core API', 'REMEDIATION', Colors.red[200]!, Colors.purpleAccent),
        const SizedBox(height: 8),
        _buildFindingCard('Missing Security Headers (HSTS)', 'Owner: Web Team • Affected: Frontend', 'OPEN', Colors.lightBlueAccent, Colors.grey),
        const SizedBox(height: 8),
        _buildFindingCard('Insecure Direct Object Reference', 'Owner: Charlie Davis • Affected: User Profile', 'RETEST', Colors.orange, Colors.grey),
        const SizedBox(height: 32),
        _buildDetailsPanel(),
      ],
    );
  }

  Widget _buildFindingCard(String title, String subtitle, String pillText, Color dotColor, Color pillColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B),
        borderRadius: BorderRadius.circular(SentinelRadii.lg),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: dotColor,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(title, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Text(subtitle, style: const TextStyle(color: Colors.white54, fontSize: 11)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: pillColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(SentinelRadii.pill),
              border: Border.all(color: pillColor.withValues(alpha: 0.3)),
            ),
            child: Text(
              pillText,
              style: TextStyle(color: pillColor, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5),
            ),
          ),
        ],
      ),
    );
  }



  Widget _buildDetailsPanel() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF16181F),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white10),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2), 
            blurRadius: 8, 
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Text(
                  'SQL Injection in Login Payload', 
                  style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold, height: 1.3),
                ),
              ),
              const SizedBox(width: 16),
              const Icon(Icons.more_horiz, color: Colors.white54, size: 24),
            ],
          ),
          const SizedBox(height: 16),
          const Text(
            'A critical SQL injection vulnerability was detected in the primary authentication endpoint. Malicious payloads constructed with specific boolean-based blind techniques bypass input sanitization, potentially allowing unauthenticated access to the backend database architecture. Immediate patch required on `AuthService/login_handler.go`.',
            style: TextStyle(color: Colors.white70, fontSize: 14, height: 1.6),
          ),
          const SizedBox(height: 24),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildTag(Icons.computer, 'Auth Service', Colors.white54),
              _buildTag(Icons.code, 'backend-go', Colors.white54),
              _buildTag(Icons.warning_amber_rounded, 'CVSS: 9.8', Colors.red[300]!, textColor: Colors.red[300]!, isAlert: true),
            ],
          ),
          const SizedBox(height: 32),
          const Text('LIFECYCLE STATUS', style: TextStyle(color: Colors.white54, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: SizedBox(
                width: 500, // Force sufficient layout width
                child: _buildLifecycleTimeline(),
              ),
            ),
          ),
          const SizedBox(height: 32),
          Align(
            alignment: Alignment.centerRight,
            child: ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.cyanAccent,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(SentinelRadii.pill)),
              ),
              child: const Text('UPDATE STATUS', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLifecycleTimeline() {
    return Row(
      children: [
        _buildTimelineNode('OPEN', true, true),
        _buildTimelineLine(true),
        _buildTimelineNode('TRIAGED', true, true),
        _buildTimelineLine(false),
        _buildTimelineNode('ASGN', false, false),
        _buildTimelineLine(false),
        _buildTimelineNode('REM', false, false),
        _buildTimelineLine(false),
        _buildTimelineNode('TEST', false, false),
        _buildTimelineLine(false),
        _buildTimelineNode('VER', false, false),
        _buildTimelineLine(false),
        _buildTimelineNode('CLS', false, false),
      ],
    );
  }

  Widget _buildTimelineNode(String label, bool isCompleted, bool isCurrent) {
    return Column(
      children: [
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: isCurrent ? Colors.transparent : (isCompleted ? Colors.cyanAccent : Colors.transparent),
            shape: BoxShape.circle,
            border: Border.all(color: isCompleted ? Colors.cyanAccent : Colors.white24, width: 2),
          ),
          child: isCurrent
              ? Center(
                  child: Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(
                      color: Colors.cyanAccent,
                      shape: BoxShape.circle,
                    ),
                  ),
                )
              : null,
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            color: isCompleted ? Colors.cyanAccent : Colors.white54,
            fontSize: 8,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildTimelineLine(bool isCompleted) {
    return Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.only(bottom: 12),
        color: isCompleted ? Colors.cyanAccent : Colors.white24,
      ),
    );
  }

  Widget _buildTag(IconData icon, String text, Color bgColor, {Color textColor = Colors.white, bool isAlert = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: isAlert ? bgColor.withValues(alpha: 0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(SentinelRadii.pill),
        border: Border.all(color: bgColor.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: textColor),
          const SizedBox(width: 6),
          Text(text, style: TextStyle(color: textColor, fontSize: 10, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

}
