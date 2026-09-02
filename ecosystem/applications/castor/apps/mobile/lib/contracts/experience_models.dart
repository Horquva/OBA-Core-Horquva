enum SignalSeverity { critical, important, informational }

enum DecisionPriority { urgent, highPriority, medium }

class ExecutiveBriefingDTO {
  final String id;
  final String title;
  final String summary;
  final String sourceSystem;
  final DateTime timestamp;
  final List<String> keyTakeaways;

  const ExecutiveBriefingDTO({
    required this.id,
    required this.title,
    required this.summary,
    required this.sourceSystem,
    required this.timestamp,
    required this.keyTakeaways,
  });
}

class AIRecommendationDTO {
  final String id;
  final String actionTitle;
  final String rationale;
  final double confidenceScore;
  final bool requiresHumanApproval;

  const AIRecommendationDTO({
    required this.id,
    required this.actionTitle,
    required this.rationale,
    required this.confidenceScore,
    required this.requiresHumanApproval,
  });
}

class SignalDTO {
  final String id;
  final String title;
  final String description;
  final SignalSeverity severity;
  final DateTime timestamp;

  const SignalDTO({
    required this.id,
    required this.title,
    required this.description,
    required this.severity,
    required this.timestamp,
  });
}
