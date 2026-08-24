import '../core/boundary_guards.dart';
import 'experience_models.dart';

class ContractSerializer {
  static ExecutiveBriefingDTO briefingFromJson(Map<String, dynamic> json) {
    BoundaryGuard.validateContractPayload(json);

    return ExecutiveBriefingDTO(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Untitled Briefing',
      summary: json['summary'] as String? ?? '',
      sourceSystem: json['sourceSystem'] as String? ?? 'OBA_BRAIN',
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'] as String)
          : DateTime.now(),
      keyTakeaways: (json['keyTakeaways'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
    );
  }

  static Map<String, dynamic> briefingToJson(ExecutiveBriefingDTO briefing) {
    final map = {
      'id': briefing.id,
      'title': briefing.title,
      'summary': briefing.summary,
      'sourceSystem': briefing.sourceSystem,
      'timestamp': briefing.timestamp.toIso8601String(),
      'keyTakeaways': briefing.keyTakeaways,
    };
    BoundaryGuard.validateContractPayload(map);
    return map;
  }

  static AIRecommendationDTO recommendationFromJson(Map<String, dynamic> json) {
    BoundaryGuard.validateContractPayload(json);

    return AIRecommendationDTO(
      id: json['id'] as String? ?? '',
      actionTitle: json['actionTitle'] as String? ?? '',
      rationale: json['rationale'] as String? ?? '',
      confidenceScore: (json['confidenceScore'] as num?)?.toDouble() ?? 0.0,
      requiresHumanApproval: json['requiresHumanApproval'] as bool? ?? true,
    );
  }
}
