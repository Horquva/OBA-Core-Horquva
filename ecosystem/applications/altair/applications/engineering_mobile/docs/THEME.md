# Theme System

## Overview

Material 3 theming with light and dark mode support. The theme system is defined in `lib/core/theme/`.

## File Structure

```
lib/core/theme/
  app_colors.dart       # Color palette definitions
  app_typography.dart   # Typography scale using Google Fonts Inter
  app_theme.dart        # Theme aggregation (light/dark accessors)
  light_theme.dart      # Light theme configuration
  dark_theme.dart       # Dark theme configuration
```

## Color Palette

| Token | Light | Dark |
|-------|-------|------|
| Primary | #1A237E | #534BAE |
| Secondary | #00897B | #4EBAAA |
| Surface | #FFFFFF | #2C2C2C |
| Background | #F0F2F5 | #1E1E1E |
| Error | #D32F2F | #D32F2F |

Semantic colors: warning (#F57C00), success (#388E3C), info (#1976D2)

## Typography

Using Inter font family from Google Fonts with 15 text styles:

- **displayLarge/Small**: Hero text (32/24px, bold)
- **headlineLarge/Small**: Section headers (22/18px, semibold)
- **titleLarge/Small**: Card titles (16/13px, semibold/medium)
- **bodyLarge/Small**: Body text (16/12px, regular)
- **labelLarge/Small**: Labels and metadata (14/11px, medium)

## Theme Components

Both themes configure:

- AppBar, Card, Button (elevated/outlined/text), Input fields
- BottomNavigationBar, Divider, Chip, FAB
- Consistent border radius (12px for inputs/buttons, 16px for cards)

## Theme Switching

```dart
// Toggle between light and dark
context.read<ThemeCubit>().toggleTheme();

// Set specific mode
context.read<ThemeCubit>().setTheme(ThemeMode.dark);
```

The `ThemeCubit` (Bloc) in `main.dart` manages the active theme state.
