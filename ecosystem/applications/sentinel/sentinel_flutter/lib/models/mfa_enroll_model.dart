import '../core/errors/failures.dart';

class MfaEnrollModel {
  final String otpauthUri;
  final List<String> recoveryCodes;

  const MfaEnrollModel({
    required this.otpauthUri,
    required this.recoveryCodes,
  });

  factory MfaEnrollModel.fromJson(Map<String, dynamic> json) {
    final otpauthUri = json['otpauthUri'];
    final recoveryCodes = json['recoveryCodes'];

    if (otpauthUri is! String) {
      throw const ParsingFailure('MfaEnrollModel: otpauthUri must be a string');
    }

    if (recoveryCodes is! List) {
      throw const ParsingFailure('MfaEnrollModel: recoveryCodes must be a list');
    }

    final parsedCodes = <String>[];
    for (final code in recoveryCodes) {
      if (code is! String) {
        throw const ParsingFailure('MfaEnrollModel: all recovery codes must be strings');
      }
      parsedCodes.add(code);
    }

    return MfaEnrollModel(
      otpauthUri: otpauthUri,
      recoveryCodes: parsedCodes,
    );
  }
}
