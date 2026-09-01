import '../core/errors/failures.dart';

class AuthzDecisionModel {
  final String decision;
  final String? reason;

  const AuthzDecisionModel({
    required this.decision,
    this.reason,
  });

  bool get isAllowed => decision == 'allow';

  factory AuthzDecisionModel.fromJson(Map<String, dynamic> json) {
    final decision = json['decision'];
    final reason = json['reason'];

    if (decision is! String) {
      throw const ParsingFailure('AuthzDecisionModel: decision must be a string');
    }

    if (reason != null && reason is! String) {
      throw const ParsingFailure('AuthzDecisionModel: reason must be a string');
    }

    return AuthzDecisionModel(
      decision: decision,
      reason: reason,
    );
  }
}
