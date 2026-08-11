import 'package:flutter/material.dart';
import '../../core/constants/app_dimensions.dart';

class CustomScaffold extends StatelessWidget {
  final Widget body;
  final String? title;
  final List<Widget>? actions;
  final Widget? leading;
  final bool showBackButton;
  final Widget? bottomNavigationBar;
  final Widget? floatingActionButton;
  final Color? backgroundColor;
  final PreferredSizeWidget? bottom;
  final bool? resizeToAvoidBottomInset;

  const CustomScaffold({
    super.key,
    required this.body,
    this.title,
    this.actions,
    this.leading,
    this.showBackButton = false,
    this.bottomNavigationBar,
    this.floatingActionButton,
    this.backgroundColor,
    this.bottom,
    this.resizeToAvoidBottomInset,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor:
          backgroundColor ?? Theme.of(context).scaffoldBackgroundColor,
      resizeToAvoidBottomInset: resizeToAvoidBottomInset,
      appBar: title != null || showBackButton
          ? AppBar(
              title: title != null ? Text(title!) : null,
              actions: actions,
              leading: showBackButton
                  ? leading ??
                        IconButton(
                          icon: const Icon(Icons.arrow_back_ios_new),
                          onPressed: () => Navigator.of(context).pop(),
                        )
                  : leading,
              bottom: bottom,
            )
          : null,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppDimensions.md),
          child: body,
        ),
      ),
      bottomNavigationBar: bottomNavigationBar,
      floatingActionButton: floatingActionButton,
    );
  }
}
