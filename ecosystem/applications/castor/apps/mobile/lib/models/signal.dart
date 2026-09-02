import '../views/widgets/severity_badge.dart';

/// A single Signal — plain data only (no UI, no colours, no icons).
///
/// This is a "domain model": it holds just the data that comes from the backend
/// (server or database). Widgets decide the icon/colour later from [severity].
class Signal {
  const Signal({
    required this.id,
    required this.severity,
    required this.title,
    required this.description,
    required this.time,
    this.tags = const [],
    this.impact = '',
    this.probability = '',
  });

  /// Unique id (useful when opening the detail screen or updating one item).
  final String id;

  /// How urgent the signal is.
  final Severity severity;

  /// The signal headline.
  final String title;

  /// A short explanation of the signal.
  final String description;

  /// When it happened, e.g. "08:12 AM".
  final String time;

  /// Category tags, e.g. ["Operations", "Risk"].
  final List<String> tags;

  /// Business impact, e.g. "High" (shown on the Overview highlight card).
  final String impact;

  /// Probability, e.g. "Likely" (shown on the Overview highlight card).
  final String probability;

  /// Builds a Signal from a JSON map — i.e. a server/database response.
  ///
  /// When you connect a real backend, the response just needs the same keys.
  factory Signal.fromJson(Map<String, dynamic> json) {
    return Signal(
      id: json['id'] as String,
      severity: severityFromString(json['severity'] as String),
      title: json['title'] as String,
      description: json['description'] as String,
      time: json['time'] as String,
      tags: (json['tags'] as List<dynamic>? ?? const []).cast<String>(),
      impact: json['impact'] as String? ?? '',
      probability: json['probability'] as String? ?? '',
    );
  }
}
