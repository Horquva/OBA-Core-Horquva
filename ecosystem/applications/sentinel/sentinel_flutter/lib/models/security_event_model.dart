import '../core/errors/failures.dart';

class SecurityEventModel {
  final String eventId;
  final String eventType;
  final String repository;
  final String commit;
  final DateTime timestamp;
  final String decision;

  const SecurityEventModel({
    required this.eventId,
    required this.eventType,
    required this.repository,
    required this.commit,
    required this.timestamp,
    required this.decision,
  });

  factory SecurityEventModel.fromJson(Map<String, dynamic> json) {
    final eventIdRaw = json['event_id'];
    final eventTypeRaw = json['event_type'];
    final repositoryRaw = json['repository'];
    final commitRaw = json['commit'];
    final timestampRaw = json['timestamp'];
    final decisionRaw = json['decision'];

    if (eventIdRaw is! String) throw const ParsingFailure('SecurityEventModel: event_id must be a string');
    if (eventTypeRaw is! String) throw const ParsingFailure('SecurityEventModel: event_type must be a string');
    if (repositoryRaw is! String) throw const ParsingFailure('SecurityEventModel: repository must be a string');
    if (commitRaw is! String) throw const ParsingFailure('SecurityEventModel: commit must be a string');
    if (decisionRaw is! String) throw const ParsingFailure('SecurityEventModel: decision must be a string');
    if (timestampRaw is! String) throw const ParsingFailure('SecurityEventModel: timestamp must be a string');

    DateTime timestamp;
    try {
      timestamp = DateTime.parse(timestampRaw);
    } catch (_) {
      throw ParsingFailure('SecurityEventModel: invalid ISO-8601 string for timestamp: $timestampRaw');
    }

    return SecurityEventModel(
      eventId: eventIdRaw,
      eventType: eventTypeRaw,
      repository: repositoryRaw,
      commit: commitRaw,
      timestamp: timestamp,
      decision: decisionRaw,
    );
  }
}
