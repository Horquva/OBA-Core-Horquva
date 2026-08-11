import 'package:flutter/material.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../shared/widgets/app_card.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _isDarkMode = false;
  String _selectedLanguage = 'English';
  bool _pushNotifications = true;
  bool _emailNotifications = true;
  bool _darkModeAuto = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppDimensions.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Settings', style: theme.textTheme.headlineSmall),
          const SizedBox(height: AppDimensions.lg),
          _buildAppearanceSection(context),
          const SizedBox(height: AppDimensions.lg),
          _buildNotificationsSection(context),
          const SizedBox(height: AppDimensions.lg),
          _buildAccountSection(context),
          const SizedBox(height: AppDimensions.lg),
          _buildAboutSection(context),
        ],
      ),
    );
  }

  Widget _buildAppearanceSection(BuildContext context) {
    final theme = Theme.of(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.palette_outlined, color: theme.colorScheme.primary),
              const SizedBox(width: AppDimensions.sm),
              Text('Appearance', style: theme.textTheme.titleMedium),
            ],
          ),
          const SizedBox(height: AppDimensions.md),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Dark Mode'),
            subtitle: const Text('Switch between light and dark theme'),
            value: _isDarkMode,
            onChanged: (value) => setState(() => _isDarkMode = value),
            activeTrackColor: theme.colorScheme.primary,
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Auto Dark Mode'),
            subtitle: const Text('Follow system theme'),
            value: _darkModeAuto,
            onChanged: (value) => setState(() => _darkModeAuto = value),
            activeTrackColor: theme.colorScheme.primary,
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Language'),
            subtitle: Text(_selectedLanguage),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showLanguagePicker(context),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationsSection(BuildContext context) {
    final theme = Theme.of(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.notifications_outlined, color: theme.colorScheme.primary),
              const SizedBox(width: AppDimensions.sm),
              Text('Notifications', style: theme.textTheme.titleMedium),
            ],
          ),
          const SizedBox(height: AppDimensions.md),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Push Notifications'),
            subtitle: const Text('Receive push notifications'),
            value: _pushNotifications,
            onChanged: (value) => setState(() => _pushNotifications = value),
            activeTrackColor: theme.colorScheme.primary,
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Email Notifications'),
            subtitle: const Text('Receive email updates'),
            value: _emailNotifications,
            onChanged: (value) => setState(() => _emailNotifications = value),
            activeTrackColor: theme.colorScheme.primary,
          ),
        ],
      ),
    );
  }

  Widget _buildAccountSection(BuildContext context) {
    final theme = Theme.of(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.person_outline, color: theme.colorScheme.primary),
              const SizedBox(width: AppDimensions.sm),
              Text('Account', style: theme.textTheme.titleMedium),
            ],
          ),
          const SizedBox(height: AppDimensions.md),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.edit_outlined),
            title: const Text('Edit Profile'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.security_outlined),
            title: const Text('Security'),
            subtitle: const Text('Password, 2FA, sessions'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.download_outlined),
            title: const Text('Export Data'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
        ],
      ),
    );
  }

  Widget _buildAboutSection(BuildContext context) {
    final theme = Theme.of(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.info_outline, color: theme.colorScheme.primary),
              const SizedBox(width: AppDimensions.sm),
              Text('About', style: theme.textTheme.titleMedium),
            ],
          ),
          const SizedBox(height: AppDimensions.md),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Version'),
            subtitle: const Text(AppConstants.appVersion),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('App Name'),
            subtitle: const Text(AppConstants.appName),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Organization'),
            subtitle: const Text(AppConstants.organizationName),
          ),
          const SizedBox(height: AppDimensions.sm),
          Center(
            child: Text(
              'Engineering Mobile Applications Platform',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }

  void _showLanguagePicker(BuildContext context) {
    final languages = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 'Chinese'];
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppDimensions.radiusLg)),
      ),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: AppDimensions.md),
              Text('Select Language', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: AppDimensions.sm),
              const Divider(),
              ...languages.map((lang) {
                return ListTile(
                  title: Text(lang),
                  trailing: _selectedLanguage == lang
                      ? Icon(Icons.check, color: Theme.of(context).colorScheme.primary)
                      : null,
                  onTap: () {
                    setState(() => _selectedLanguage = lang);
                    Navigator.pop(context);
                  },
                );
              }),
            ],
          ),
        );
      },
    );
  }
}
