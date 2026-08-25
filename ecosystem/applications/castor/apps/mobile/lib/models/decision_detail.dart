import 'decision.dart';

/// Full details of one decision — plain data from the backend.
class DecisionDetail {
  const DecisionDetail({
    required this.id,
    required this.priority,
    required this.title,
    required this.dueLabel,
    required this.description,
    required this.impact,
    required this.priorityText,
    required this.businessArea,
    required this.owner,
    required this.estimatedValue,
    required this.summary,
  });

  final String id;
  final DecisionPriority priority;
  final String title;

  /// e.g. "Today, 02:00 PM".
  final String dueLabel;

  /// The paragraph under the title.
  final String description;

  // The key/value facts.
  final String impact;
  final String priorityText; // e.g. "Urgent" (title case for the facts row)
  final String businessArea;
  final String owner;
  final String estimatedValue;

  /// The "Summary" section text.
  final String summary;

  /// Builds a DecisionDetail from a JSON map (a server/database response).
  factory DecisionDetail.fromJson(Map<String, dynamic> json) {
    return DecisionDetail(
      id: json['id'] as String,
      priority: decisionPriorityFromString(json['priority'] as String),
      title: json['title'] as String,
      dueLabel: json['dueLabel'] as String,
      description: json['description'] as String,
      impact: json['impact'] as String,
      priorityText: json['priorityText'] as String,
      businessArea: json['businessArea'] as String,
      owner: json['owner'] as String,
      estimatedValue: json['estimatedValue'] as String,
      summary: json['summary'] as String,
    );
  }
}
