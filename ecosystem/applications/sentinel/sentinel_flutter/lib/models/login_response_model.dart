import '../core/errors/failures.dart';
import 'auth_token_model.dart';

class LoginResponseModel {
  final AuthTokenModel? tokens;
  final String? status;
  final String? challengeId;

  const LoginResponseModel._({
    this.tokens,
    this.status,
    this.challengeId,
  });

  bool get requiresMfa => status == 'mfa_required';

  factory LoginResponseModel.fromJson(Map<String, dynamic> json) {
    final status = json['status'];
    final challengeId = json['challengeId'];

    if (status != null && status is! String) {
      throw const ParsingFailure('LoginResponseModel: status must be a string');
    }

    if (challengeId != null && challengeId is! String) {
      throw const ParsingFailure('LoginResponseModel: challengeId must be a string');
    }

    if (status != null) {
      if (status != 'mfa_required') {
        throw ParsingFailure('LoginResponseModel: unexpected status value: $status');
      }
      if (challengeId == null) {
        throw const ParsingFailure('LoginResponseModel: challengeId missing when mfa_required');
      }
      return LoginResponseModel._(
        status: status,
        challengeId: challengeId,
      );
    }

    return LoginResponseModel._(
      tokens: AuthTokenModel.fromJson(json),
    );
  }
}
