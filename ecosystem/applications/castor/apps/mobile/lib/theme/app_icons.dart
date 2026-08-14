import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// Castor Design System — Icon Tokens (Iconography).
///
/// The design system uses the Lucide icon set (thin outline, 2px stroke).
/// This file gives every icon a clear, meaningful name in one place, so screens
/// write `AppIcons.signals` instead of remembering the raw Lucide name. If we
/// ever change an icon, we change it here once and the whole app follows.
abstract final class AppIcons {
  AppIcons._();

  // ─── Navigation ────────────────────────────────────────────────────────
  static const IconData overview = LucideIcons.home;
  static const IconData briefing = LucideIcons.fileText;
  static const IconData signals = LucideIcons.activity;
  static const IconData decisions = LucideIcons.clipboardCheck;
  static const IconData risks = LucideIcons.shield;
  static const IconData opportunities = LucideIcons.target;
  static const IconData knowledgeGraph = LucideIcons.network;
  static const IconData reports = LucideIcons.barChart2;
  static const IconData simulations = LucideIcons.boxes;
  static const IconData organization = LucideIcons.users;
  static const IconData settings = LucideIcons.settings;
  static const IconData more = LucideIcons.layoutGrid; // bottom-nav "More"
  static const IconData castor = LucideIcons.sparkle; // center brand star

  // ─── Top bar / actions ─────────────────────────────────────────────────
  static const IconData notification = LucideIcons.bell;
  static const IconData search = LucideIcons.search;
  static const IconData filter = LucideIcons.filter;
  static const IconData share = LucideIcons.share2;
  static const IconData dropdown = LucideIcons.chevronDown;
  static const IconData lastUpdated = LucideIcons.power;
  static const IconData send = LucideIcons.arrowRight;
  static const IconData play = LucideIcons.play;

  // ─── Severity (leading icon on signal cards) ───────────────────────────
  static const IconData critical = LucideIcons.alertTriangle;
  static const IconData important = LucideIcons.circleAlert;
  static const IconData informational = LucideIcons.messageSquare;

  // ─── Decision priority icons (one per priority level) ──────────────────
  static const IconData urgent = LucideIcons.siren;
  static const IconData highPriority = LucideIcons.trendingUp; // zigzag arrow
  static const IconData medium = LucideIcons.minus;

  // ─── Other status / content ────────────────────────────────────────────
  static const IconData sparkle = LucideIcons.sparkles;
  static const IconData attention = LucideIcons.target;
}
