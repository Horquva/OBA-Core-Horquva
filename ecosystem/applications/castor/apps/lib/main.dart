import 'package:flutter/material.dart';

import 'showcase/component_showcase.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const CastorApp());
}

/// Root widget of the Castor app.
///
/// For Part C, the app simply opens the Component Showcase so we can see and
/// test the reusable components. The real app shell will replace this later.
class CastorApp extends StatelessWidget {
  const CastorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Castor',
      debugShowCheckedModeBanner: false,
      // Apply the design system theme so components render correctly.
      theme: AppTheme.light,
      home: const ComponentShowcase(),
    );
  }
}
