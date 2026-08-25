import 'package:flutter/widgets.dart';

import '../../models/decision.dart';
import '../../theme/app_icons.dart';
import 'severity_badge.dart';

/// Priority → UI helpers, shared by the Decisions list and the detail screen so
/// both colour and label a priority the same way.

/// Reuse the signal colour system: urgent = red, high = amber, medium = green.
Severity decisionSeverity(DecisionPriority p) {
  switch (p) {
    case DecisionPriority.urgent:
      return Severity.critical;
    case DecisionPriority.high:
      return Severity.important;
    case DecisionPriority.medium:
      return Severity.informational;
  }
}

/// The uppercase badge text.
String decisionPriorityLabel(DecisionPriority p) {
  switch (p) {
    case DecisionPriority.urgent:
      return 'URGENT';
    case DecisionPriority.high:
      return 'HIGH PRIORITY';
    case DecisionPriority.medium:
      return 'MEDIUM PRIORITY';
  }
}

/// The leading icon for a priority.
IconData decisionPriorityIcon(DecisionPriority p) {
  switch (p) {
    case DecisionPriority.urgent:
      return AppIcons.urgent;
    case DecisionPriority.high:
      return AppIcons.highPriority;
    case DecisionPriority.medium:
      return AppIcons.medium;
  }
}
