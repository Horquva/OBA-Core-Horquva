/// How urgent a decision is.
enum DecisionPriority { urgent, high, medium }

/// A single Decision that needs attention — plain data from the backend.
///
/// A "domain model": it only holds data. The screen decides the colour, label
/// and icon from [priority].
class Decision {
  const Decision({
    required this.id,
    required this.priority,
    required this.title,
    required this.impact,
    required this.action,
    required this.due,
  });

  final String id;
  final DecisionPriority priority;

  /// The decision headline, e.g. "Approve Q3 Investment Plan".
  final String title;

  /// Impact level word, e.g. "High" / "Medium" / "Low".
  final String impact;

  /// What is needed, e.g. "Requires your decision" / "For approval".
  final String action;

  /// The deadline text, e.g. "Today, 02:00 PM".
  final String due;

  /// Builds a Decision from a JSON map (a server/database response).
  factory Decision.fromJson(Map<String, dynamic> json) {
    return Decision(
      id: json['id'] as String,
      priority: decisionPriorityFromString(json['priority'] as String),
      title: json['title'] as String,
      impact: json['impact'] as String,
      action: json['action'] as String,
      due: json['due'] as String,
    );
  }
}

/// Turns a priority string (e.g. "urgent") into the [DecisionPriority] enum.
DecisionPriority decisionPriorityFromString(String value) {
  switch (value) {
    case 'urgent':
      return DecisionPriority.urgent;
    case 'high':
      return DecisionPriority.high;
    default:
      return DecisionPriority.medium;
  }
}
