import '../core/errors/failures.dart';

enum FindingSource {
  sast, dast, dependency, secret, iac, container, supplyChain, runtime, policy, configuration;

  static FindingSource fromString(String value) {
    switch (value) {
      case 'sast': return FindingSource.sast;
      case 'dast': return FindingSource.dast;
      case 'dependency': return FindingSource.dependency;
      case 'secret': return FindingSource.secret;
      case 'iac': return FindingSource.iac;
      case 'container': return FindingSource.container;
      case 'supply_chain': return FindingSource.supplyChain;
      case 'runtime': return FindingSource.runtime;
      case 'policy': return FindingSource.policy;
      case 'configuration': return FindingSource.configuration;
      default:
        throw ParsingFailure('FindingModel: unknown source value "$value"');
    }
  }
}

enum FindingSeverity {
  critical, high, medium, low, informational;

  static FindingSeverity fromString(String value) {
    switch (value) {
      case 'critical': return FindingSeverity.critical;
      case 'high': return FindingSeverity.high;
      case 'medium': return FindingSeverity.medium;
      case 'low': return FindingSeverity.low;
      case 'informational': return FindingSeverity.informational;
      default:
        throw ParsingFailure('FindingModel: unknown severity value "$value"');
    }
  }
}

enum FindingStatus {
  detected, normalized, classified, prioritized, assigned, inRemediation, remediated, validated, closed, archived, waived;

  static FindingStatus fromString(String value) {
    switch (value) {
      case 'detected': return FindingStatus.detected;
      case 'normalized': return FindingStatus.normalized;
      case 'classified': return FindingStatus.classified;
      case 'prioritized': return FindingStatus.prioritized;
      case 'assigned': return FindingStatus.assigned;
      case 'in_remediation': return FindingStatus.inRemediation;
      case 'remediated': return FindingStatus.remediated;
      case 'validated': return FindingStatus.validated;
      case 'closed': return FindingStatus.closed;
      case 'archived': return FindingStatus.archived;
      case 'waived': return FindingStatus.waived;
      default:
        throw ParsingFailure('FindingModel: unknown status value "$value"');
    }
  }
}

class FindingModel {
  final String findingId;
  final FindingSource source;
  final String repository;
  final FindingSeverity severity;
  final String category;
  final FindingStatus status;
  final DateTime detectedAt;

  const FindingModel({
    required this.findingId,
    required this.source,
    required this.repository,
    required this.severity,
    required this.category,
    required this.status,
    required this.detectedAt,
  });

  factory FindingModel.fromJson(Map<String, dynamic> json) {
    final findingId = json['finding_id'];
    final sourceRaw = json['source'];
    final repository = json['repository'];
    final severityRaw = json['severity'];
    final category = json['category'];
    final statusRaw = json['status'];
    final detectedAtRaw = json['detected_at'];

    if (findingId is! String) throw const ParsingFailure('FindingModel: finding_id must be a string');
    if (sourceRaw is! String) throw const ParsingFailure('FindingModel: source must be a string');
    if (repository is! String) throw const ParsingFailure('FindingModel: repository must be a string');
    if (severityRaw is! String) throw const ParsingFailure('FindingModel: severity must be a string');
    if (category is! String) throw const ParsingFailure('FindingModel: category must be a string');
    if (statusRaw is! String) throw const ParsingFailure('FindingModel: status must be a string');
    if (detectedAtRaw is! String) throw const ParsingFailure('FindingModel: detected_at must be a string');

    DateTime detectedAt;
    try {
      detectedAt = DateTime.parse(detectedAtRaw);
    } catch (_) {
      throw ParsingFailure('FindingModel: invalid ISO-8601 string for detected_at: $detectedAtRaw');
    }

    return FindingModel(
      findingId: findingId,
      source: FindingSource.fromString(sourceRaw),
      repository: repository,
      severity: FindingSeverity.fromString(severityRaw),
      category: category,
      status: FindingStatus.fromString(statusRaw),
      detectedAt: detectedAt,
    );
  }
}
