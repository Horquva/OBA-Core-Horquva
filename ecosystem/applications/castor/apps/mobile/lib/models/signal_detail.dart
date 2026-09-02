import '../views/widgets/severity_badge.dart';

/// Full details of one signal — plain data from the backend.
///
/// This is a richer model than [Signal] (used in the list): it also has the
/// key/value facts and the "What happened?" text shown on the detail screen.
class SignalDetail {
  const SignalDetail({
    required this.id,
    required this.severity,
    required this.title,
    required this.dateLabel,
    required this.summary,
    required this.category,
    required this.domain,
    required this.impact,
    required this.probability,
    required this.relatedSystems,
    required this.whatHappened,
  });

  final String id;
  final Severity severity;
  final String title;

  /// e.g. "Today, 08:12 AM".
  final String dateLabel;

  /// The main paragraph under the title.
  final String summary;

  // The key/value facts shown in the middle of the screen.
  final String category;
  final String domain;
  final String impact;
  final String probability;
  final String relatedSystems;

  /// The "What happened?" explanation.
  final String whatHappened;

  /// Builds a SignalDetail from a JSON map (a server/database response).
  factory SignalDetail.fromJson(Map<String, dynamic> json) {
    return SignalDetail(
      id: json['id'] as String,
      severity: severityFromString(json['severity'] as String),
      title: json['title'] as String,
      dateLabel: json['dateLabel'] as String,
      summary: json['summary'] as String,
      category: json['category'] as String,
      domain: json['domain'] as String,
      impact: json['impact'] as String,
      probability: json['probability'] as String,
      relatedSystems: json['relatedSystems'] as String,
      whatHappened: json['whatHappened'] as String,
    );
  }
}
