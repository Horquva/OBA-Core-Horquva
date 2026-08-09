import 'package:flutter/material.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CastorApp());
}

class CastorApp extends StatelessWidget {
  const CastorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Castor Executive Platform',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1E1E2C),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF12121D),
      ),
      home: const CastorHomeScreen(),
    );
  }
}

class CastorHomeScreen extends StatelessWidget {
  const CastorHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Castor Executive Workspace'),
        centerTitle: false,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.dashboard_customize_rounded,
              size: 64,
              color: Color(0xFF8B5CF6),
            ),
            const SizedBox(height: 16),
            Text(
              'Castor v2.0 Workspace Engine',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Horquva Executive Experience Platform',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[400],
                  ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.rocket_launch_rounded),
              label: const Text('Initialize Executive Session'),
            ),
          ],
        ),
      ),
    );
  }
}
