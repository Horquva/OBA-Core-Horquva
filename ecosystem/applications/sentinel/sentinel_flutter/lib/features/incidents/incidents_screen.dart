import 'package:flutter/material.dart';
import '../_ui/navigation/sentinel_shell.dart';
import '../_ui/state_views/sentinel_state_views.dart';
import '../_ui/theme/sentinel_colors.dart';
import '../_ui/theme/sentinel_spacing.dart';
import '../_ui/theme/sentinel_text_styles.dart';
import '../_ui/theme/sentinel_radii.dart';

/// Incidents Screen (Deep dive into security events)
/// Owner: Muhammad Anas (Experience Layer)
class IncidentsScreen extends StatelessWidget {
  const IncidentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(SentinelSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildHeader(),
              const SizedBox(height: SentinelSpacing.lg),
              _buildSearchBar(),
              const SizedBox(height: SentinelSpacing.md),
              _buildTabBar(),
              const SizedBox(height: SentinelSpacing.lg),
              _buildEventCard(),
              const SizedBox(height: SentinelSpacing.xl),
              _buildEventFlow(),
              const SizedBox(height: 100), // Bottom padding
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
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Investigate',
              style: TextStyle(
                fontFamily: 'Inter',
                fontWeight: FontWeight.w900,
                fontSize: 24,
                color: Colors.white,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Deep dive into security events',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: SentinelColors.textSecondary,
              ),
            ),
          ],
        ),
        Icon(Icons.grid_view_rounded, color: SentinelColors.textSecondary, size: 24),
      ],
    );
  }

  Widget _buildSearchBar() {
    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF0D121B),
              borderRadius: BorderRadius.circular(SentinelRadii.md),
              border: Border.all(color: Colors.white10),
            ),
            child: Row(
              children: [
                Icon(Icons.search, color: SentinelColors.textSecondary, size: 18),
                const SizedBox(width: 12),
                Text(
                  'Search events, IP, user, asset...',
                  style: TextStyle(color: SentinelColors.textSecondary, fontSize: 13, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF0D121B),
            borderRadius: BorderRadius.circular(SentinelRadii.md),
            border: Border.all(color: Colors.white10),
          ),
          child: Icon(Icons.filter_alt_outlined, color: SentinelColors.textSecondary, size: 18),
        ),
      ],
    );
  }

  Widget _buildTabBar() {
    final tabs = ['Events', 'Threats', 'Users', 'Assets', 'Sessions'];
    return Container(
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.white10, width: 1)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: tabs.map((tab) {
          final isActive = tab == 'Events';
          return Container(
            padding: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              border: isActive
                  ? const Border(bottom: BorderSide(color: SentinelColors.primaryGlow, width: 2))
                  : null,
            ),
            child: Text(
              tab,
              style: TextStyle(
                color: isActive ? Colors.white : SentinelColors.textSecondary,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildEventCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B),
        borderRadius: BorderRadius.circular(SentinelRadii.lg),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.redAccent.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.redAccent.withValues(alpha: 0.3)),
                ),
                child: const Icon(Icons.shield_outlined, color: Colors.redAccent, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('SQL Injection Attempt', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 2),
                    Text('Web Application • API Gateway', style: TextStyle(color: SentinelColors.textSecondary, fontSize: 11, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              Row(
                children: [
                  Text('2m ago', style: TextStyle(color: SentinelColors.textSecondary, fontSize: 12)),
                  const SizedBox(width: 4),
                  Icon(Icons.chevron_right, color: SentinelColors.textSecondary, size: 16),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Tag
          const Text('CRITICAL', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.w900, fontSize: 11, letterSpacing: 1)),
          const SizedBox(height: 12),
          // Maps
          _buildMapImage(),
          const SizedBox(height: 20),
          // Stats Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildStatCol('SOURCE IP', '103.21.244.10', true),
              _buildStatCol('TARGET', 'api.sentinel...', false),
              _buildRiskCol(),
            ],
          ),
          const SizedBox(height: 20),
          // Info Tags
          Row(
            children: [
              Expanded(child: _buildInfoTag('OWASP A03:2021', 'Injection')),
              const SizedBox(width: 12),
              Expanded(child: _buildInfoTag('MITRE T1055', 'Exploitation for Client...')),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMapImage() {
    return Container(
      width: double.infinity,
      height: 140, // Height for the wide landscape display
      decoration: BoxDecoration(
        color: const Color(0xFF161B26),
        borderRadius: BorderRadius.circular(SentinelRadii.sm),
        border: Border.all(color: Colors.white10),
        image: const DecorationImage(
          image: NetworkImage('https://lh3.googleusercontent.com/aida-public/AB6AXuBUA-ACtrGV-0UNWEd-z4K6y6p_dtsABg9wj-vmLfIZrwIUgfyni7u2KXCgzA7HSM9e_6wxX94SEYAoGb2iGkz4EbwbKlI-fzwbNykuz5L4TSF2c0xG8jmRdtfz_rJ_mEY0TeguCji67Kho5qOGbIN9c9SCbSqaCVmsibO7hQX9dmz4qme_65_Rg-iubMtvRwJbzvn35tAtPJgs5Nuu5kWLKefCttj0IdPYrrS-pLtwYcvSyAu_p5u8WQ'), // Generic world map placeholder
          fit: BoxFit.cover,
          opacity: 0.8,
        ),
      ),
    );
  }

  Widget _buildStatCol(String label, String value, bool isIp) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: SentinelColors.textSecondary, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
        if (isIp) ...[
          const SizedBox(height: 4),
          Row(
            children: [
              Container(width: 6, height: 6, decoration: const BoxDecoration(color: SentinelColors.primaryGlow, shape: BoxShape.circle)),
              const SizedBox(width: 4),
              const Text('Pakistan', style: TextStyle(color: SentinelColors.primaryGlow, fontSize: 10, fontWeight: FontWeight.bold)),
            ],
          ),
        ] else ...[
          const SizedBox(height: 4),
          Text('/v1/users/search', style: TextStyle(color: SentinelColors.textSecondary, fontSize: 10)),
        ],
      ],
    );
  }

  Widget _buildRiskCol() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('RISK SCORE', style: TextStyle(color: SentinelColors.textSecondary, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
        const SizedBox(height: 4),
        RichText(
          text: const TextSpan(
            text: '98',
            style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
            children: [TextSpan(text: '/100', style: TextStyle(fontSize: 10, color: SentinelColors.textSecondary))],
          ),
        ),
        const SizedBox(height: 4),
        const Text('Critical', style: TextStyle(color: Colors.redAccent, fontSize: 10, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildInfoTag(String top, String bottom) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: const Color(0xFF161B26),
        borderRadius: BorderRadius.circular(SentinelRadii.sm),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(top, style: TextStyle(color: SentinelColors.textSecondary, fontSize: 9, fontWeight: FontWeight.bold)),
          const SizedBox(height: 2),
          Text(bottom, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }

  Widget _buildEventFlow() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Event Flow', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            const Text('See Full Details', style: TextStyle(color: SentinelColors.primaryGlow, fontSize: 12, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF0D121B),
            borderRadius: BorderRadius.circular(SentinelRadii.lg),
            border: Border.all(color: Colors.white10),
          ),
          child: Column(
            children: [
              _buildFlowStep('01', 'Request Received', '103.21.244.10', '10:21:11 AM', SentinelColors.primaryGlow),
              _buildFlowLine(),
              _buildFlowStep('02', 'Attack Pattern Detected', 'SQL Injection Signature', '10:21:12 AM', Colors.redAccent),
              _buildFlowLine(),
              _buildFlowStep('03', 'Request Blocked', 'WAF Rule: 942100', '10:21:12 AM', Colors.redAccent),
              _buildFlowLine(),
              _buildFlowStep('04', 'Security Event Created', 'High Risk', '10:21:13 AM', SentinelColors.primaryGlow, isLast: true),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFlowStep(String num, String title, String sub, String time, Color color, {bool isLast = false}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 24,
          height: 24,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            shape: BoxShape.circle,
            border: Border.all(color: color.withValues(alpha: 0.5)),
          ),
          child: Text(num, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.bold)),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
              const SizedBox(height: 2),
              Text(sub, style: TextStyle(color: SentinelColors.textSecondary, fontSize: 11, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
        Text(time, style: TextStyle(color: SentinelColors.textSecondary, fontSize: 10, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildFlowLine() {
    return Container(
      margin: const EdgeInsets.only(left: 11, top: 4, bottom: 4),
      alignment: Alignment.centerLeft,
      height: 20,
      child: Container(width: 2, color: Colors.white10),
    );
  }
}

/// Security Event Detail Screen
/// Owner: Muhammad Anas (Experience Layer)
class EventDetailScreen extends StatelessWidget {
  final String eventId;

  const EventDetailScreen({required this.eventId, super.key});

  @override
  Widget build(BuildContext context) {
    return SentinelScaffold(
      title: 'Event Detail',
      showBackButton: true,
      body: SentinelUnavailableView(domainName: 'Event Detail'),
    );
  }
}
