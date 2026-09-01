import '../core/errors/failures.dart';

class AuthTokenModel {
  final String accessToken;
  final String refreshToken;

  const AuthTokenModel({
    required this.accessToken,
    required this.refreshToken,
  });

  factory AuthTokenModel.fromJson(Map<String, dynamic> json) {
    final accessToken = json['accessToken'];
    final refreshToken = json['refreshToken'];

    if (accessToken is! String || refreshToken is! String) {
      throw const ParsingFailure('AuthTokenModel: Missing or invalid accessToken/refreshToken');
    }

    return AuthTokenModel(
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
  }
}
