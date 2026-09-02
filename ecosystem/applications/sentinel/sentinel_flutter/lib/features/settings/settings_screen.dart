import 'package:flutter/material.dart';
import '../_ui/theme/sentinel_colors.dart';
import '../_ui/theme/sentinel_spacing.dart';
import '../_ui/theme/sentinel_radii.dart';

/// Settings & More Screen
/// Owner: Muhammad Anas (Experience Layer)
class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: _buildAppBar(),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: SentinelSpacing.md, vertical: SentinelSpacing.lg),
        child: Column(
          children: [
            _buildProfileSection(),
            const SizedBox(height: SentinelSpacing.xl),
            _buildQuickGrid(),
            const SizedBox(height: SentinelSpacing.xl),
            _buildSettingsList(),
            const SizedBox(height: SentinelSpacing.xl),
            _buildSignOutButton(),
            const SizedBox(height: SentinelSpacing.xl),
            _buildFooterText(),
            const SizedBox(height: 100), // padding for bottom nav
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      automaticallyImplyLeading: false,
      title: Row(
        children: [
          const Icon(Icons.security, color: SentinelColors.primaryGlow, size: 28),
          const SizedBox(width: 8),
          const Text(
            'SENTINEL',
            style: TextStyle(
              fontFamily: 'Space Grotesk',
              fontWeight: FontWeight.bold,
              fontSize: 20,
              letterSpacing: 1.2,
              color: Colors.white,
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.notifications_none, color: SentinelColors.textSecondary),
          onPressed: () {},
        ),
        const Padding(
          padding: EdgeInsets.only(right: 16.0),
          child: CircleAvatar(
            radius: 16,
            backgroundImage: NetworkImage('https://i.pravatar.cc/100?img=11'),
          ),
        ),
      ],
    );
  }

  Widget _buildProfileSection() {
    return Column(
      children: [
        Stack(
          alignment: Alignment.center,
          clipBehavior: Clip.none,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: SentinelColors.primaryGlow.withValues(alpha: 0.3), width: 2),
                image: const DecorationImage(
                  image: NetworkImage('https://i.pravatar.cc/100?img=11'),
                  fit: BoxFit.cover,
                ),
              ),
            ),
            Positioned(
              bottom: -10,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF0D121B),
                  borderRadius: BorderRadius.circular(SentinelRadii.sm),
                  border: Border.all(color: SentinelColors.primaryGlow.withValues(alpha: 0.5)),
                ),
                child: const Text(
                  'ADMIN',
                  style: TextStyle(
                    color: SentinelColors.primaryGlow,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1,
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        const Text(
          'Mustafa Babar',
          style: TextStyle(
            color: Colors.white,
            fontSize: 22,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Super Admin',
          style: TextStyle(
            color: SentinelColors.textSecondary,
            fontSize: 14,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildQuickGrid() {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 2.2,
      children: [
        _buildGridCard(Icons.notifications_active_outlined, 'Notifications', SentinelColors.primaryGlow),
        _buildGridCard(Icons.security_outlined, 'Security', Colors.redAccent),
        _buildGridCard(Icons.people_outline, 'Team', Colors.blueAccent),
        _buildGridCard(Icons.integration_instructions_outlined, 'Integrations', Colors.deepPurpleAccent),
      ],
    );
  }

  Widget _buildGridCard(IconData icon, String title, Color color) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B),
        borderRadius: BorderRadius.circular(SentinelRadii.lg),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 8),
          Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsList() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0D121B),
        borderRadius: BorderRadius.circular(SentinelRadii.lg),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        children: [
          _buildSettingsRow(Icons.dark_mode_outlined, 'Dark Mode',
              trailing: Switch(
                value: true,
                onChanged: (v) {},
                activeColor: Colors.white,
                activeTrackColor: Colors.cyanAccent,
              )),
          _buildDivider(),
          _buildSettingsRow(Icons.language_outlined, 'Language', trailingText: 'EN-US'),
          _buildDivider(),
          _buildSettingsRow(Icons.code_outlined, 'API Settings'),
          _buildDivider(),
          _buildSettingsRow(Icons.history_outlined, 'Audit Log'),
          _buildDivider(),
          _buildSettingsRow(Icons.help_outline, 'Help & Support'),
          _buildDivider(),
          _buildSettingsRow(Icons.info_outline, 'About'),
        ],
      ),
    );
  }

  Widget _buildSettingsRow(IconData icon, String title, {Widget? trailing, String? trailingText}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.05),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: SentinelColors.textSecondary, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
            ),
          ),
          if (trailing != null)
            trailing
          else if (trailingText != null)
            Row(
              children: [
                Text(
                  trailingText,
                  style: TextStyle(color: SentinelColors.textSecondary, fontSize: 12, fontWeight: FontWeight.bold),
                ),
                const SizedBox(width: 8),
                Icon(Icons.chevron_right, color: SentinelColors.textSecondary, size: 16),
              ],
            )
          else
            Icon(Icons.chevron_right, color: SentinelColors.textSecondary, size: 16),
        ],
      ),
    );
  }

  Widget _buildDivider() {
    return Container(
      height: 1,
      color: Colors.white10,
    );
  }

  Widget _buildSignOutButton() {
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
            const Icon(Icons.logout, color: Colors.redAccent, size: 20),
            const SizedBox(width: 8),
            const Text(
              'SIGN OUT',
              style: TextStyle(color: Colors.redAccent, fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 0.5),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFooterText() {
    return Text(
      'SENTINEL V2.4.1 - BUILD 1082',
      style: TextStyle(
        color: SentinelColors.textSecondary.withValues(alpha: 0.5),
        fontSize: 10,
        fontWeight: FontWeight.bold,
        letterSpacing: 1.5,
      ),
    );
  }
}
