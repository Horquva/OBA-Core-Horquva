import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../_ui/theme/sentinel_colors.dart';
import '../_ui/theme/sentinel_spacing.dart';
import '../_ui/theme/sentinel_radii.dart';
import '../_ui/theme/sentinel_text_styles.dart';

/// CI/CD Pipeline (DevSecOps) Domain Drill-down Screen
/// Owner: Muhammad Anas (Experience Layer)
class DevsecopsScreen extends StatelessWidget {
  const DevsecopsScreen({super.key});

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
            _buildPipelineStepper(),
            const SizedBox(height: SentinelSpacing.xl),
            
            Text(
              'RECENT PIPELINE RUNS',
              style: SentinelTextStyles.labelCaps.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: SentinelSpacing.md),
            _buildPipelineRuns(),
            const SizedBox(height: SentinelSpacing.xl),
            
            _buildViewLogButton(),
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
          const Icon(Icons.all_inclusive, color: Colors.lightBlueAccent, size: 24),
          const SizedBox(width: 8),
          const Text('CI/CD Pipeline', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
        ],
      ),
      centerTitle: true,
      actions: [
        Container(
          margin: const EdgeInsets.only(right: 16),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.white10,
            borderRadius: BorderRadius.circular(SentinelRadii.pill),
            border: Border.all(color: Colors.white24),
          ),
          child: Row(
            children: [
              const Icon(Icons.circle, color: Colors.redAccent, size: 6),
              const SizedBox(width: 6),
              const Text('Live', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPipelineStepper() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Column(
        children: [
          _buildStepRow(
            icon: Icons.check, 
            iconColor: Colors.lightBlueAccent,
            title: 'Pipeline Triggered', 
            pillText: 'STARTED', 
            pillColor: Colors.indigoAccent,
            isFirst: true,
            hasLine: true,
          ),
          _buildStepRow(
            icon: null, // Empty circle
            iconColor: Colors.transparent,
            title: 'Security Tests', 
            pillText: 'PASSED', 
            pillColor: Colors.cyanAccent,
            hasLine: true,
          ),
          _buildStepRow(
            icon: Icons.warning_amber_rounded, 
            iconColor: Colors.redAccent,
            title: 'SAST / SCA Scan', 
            pillText: 'FINDINGS', 
            pillColor: Colors.red[300]!,
            hasLine: true,
          ),
          _buildBlockedStep(),
          _buildStepRow(
            icon: Icons.inventory_2_outlined, 
            iconColor: Colors.white54,
            title: 'Artifact Build', 
            pillText: 'BUILT', 
            pillColor: Colors.grey,
            isDimmed: true,
            hasLine: true,
          ),
          _buildStepRow(
            icon: Icons.pause, 
            iconColor: Colors.white54,
            title: 'Release State', 
            pillText: 'HELD', 
            pillColor: Colors.grey,
            isDimmed: true,
            isLast: true,
          ),
        ],
      ),
    );
  }

  Widget _buildStepRow({
    required IconData? icon,
    required Color iconColor,
    required String title,
    required String pillText,
    required Color pillColor,
    bool isFirst = false,
    bool isLast = false,
    bool hasLine = false,
    bool isDimmed = false,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: iconColor == Colors.transparent ? Colors.white.withValues(alpha: 0.05) : iconColor.withValues(alpha: 0.1),
                border: Border.all(color: iconColor == Colors.transparent ? Colors.white24 : iconColor.withValues(alpha: 0.5)),
              ),
              child: icon != null ? Icon(icon, color: iconColor, size: 16) : null,
            ),
            if (!isLast && hasLine)
              Container(
                width: 1,
                height: 40,
                color: Colors.white24,
              ),
          ],
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF0D121B),
              borderRadius: BorderRadius.circular(SentinelRadii.md),
              border: Border.all(color: isDimmed ? Colors.white10 : Colors.white24, style: isDimmed ? BorderStyle.none : BorderStyle.solid), // In screenshot, dimmed ones have dashed border but we'll use a very faint solid border for simplicity or just no border and a dark background. Let's use faint border. Actually dashed isn't native, so we use white10.
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: isDimmed ? Colors.white54 : Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: pillColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    pillText,
                    style: TextStyle(
                      color: pillColor,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBlockedStep() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.red.shade900,
                border: Border.all(color: Colors.redAccent),
                boxShadow: [BoxShadow(color: Colors.redAccent.withValues(alpha: 0.5), blurRadius: 10)],
              ),
              child: const Icon(Icons.block, color: Colors.white, size: 16),
            ),
            Container(
              width: 1,
              height: 100, // taller line because card is taller
              color: Colors.white24,
            ),
          ],
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF161115), // Slight red tint background
              borderRadius: BorderRadius.circular(SentinelRadii.lg),
              border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
              boxShadow: [
                BoxShadow(color: Colors.red.withValues(alpha: 0.05), blurRadius: 8, spreadRadius: 5),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Security Gate',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.red[300],
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'BLOCKED',
                        style: TextStyle(
                          color: Colors.black,
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'Critical vulnerabilities detected in image build.\nPipeline halted.',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 11,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPipelineRuns() {
    return Column(
      children: [
        _buildRunRow('#1082', 'main / update-deps', 'BLOCKED', Colors.red[300]!),
        const SizedBox(height: 12),
        _buildRunRow('#1081', 'feature / auth-flow', 'PASSED', Colors.cyanAccent),
        const SizedBox(height: 12),
        _buildRunRow('#1080', 'hotfix / api-crash', 'PASSED', Colors.cyanAccent),
      ],
    );
  }

  Widget _buildRunRow(String runId, String branch, String status, Color statusColor) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B),
        borderRadius: BorderRadius.circular(SentinelRadii.lg),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(runId, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.commit, color: Colors.white54, size: 12),
                  const SizedBox(width: 4),
                  Text(branch, style: const TextStyle(color: Colors.white54, fontSize: 11)),
                ],
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.1),
              border: Border.all(color: statusColor.withValues(alpha: 0.3)),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              status,
              style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildViewLogButton() {
    return InkWell(
      onTap: () {},
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: const Color(0xFF0D121B),
          borderRadius: BorderRadius.circular(SentinelRadii.pill),
          border: Border.all(color: Colors.lightBlueAccent.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'VIEW FULL PIPELINE LOG',
              style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.arrow_forward_ios, color: Colors.white, size: 12),
          ],
        ),
      ),
    );
  }
}
