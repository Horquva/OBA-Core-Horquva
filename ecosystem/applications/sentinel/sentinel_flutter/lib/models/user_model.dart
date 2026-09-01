import '../core/errors/failures.dart';

class UserModel {
  final String principalId;
  final String organizationId;
  final String kind;
  final List<String> permissions;

  const UserModel({
    required this.principalId,
    required this.organizationId,
    required this.kind,
    required this.permissions,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final principalId = json['principalId'];
    final organizationId = json['organizationId'];
    final kind = json['kind'];
    final permissions = json['permissions'];

    if (principalId is! String) {
      throw const ParsingFailure('UserModel: principalId must be a string');
    }

    if (organizationId is! String) {
      throw const ParsingFailure('UserModel: organizationId must be a string');
    }

    if (kind is! String) {
      throw const ParsingFailure('UserModel: kind must be a string');
    }

    if (permissions is! List) {
      throw const ParsingFailure('UserModel: permissions must be a list');
    }

    final parsedPermissions = <String>[];
    for (final p in permissions) {
      if (p is! String) {
        throw const ParsingFailure('UserModel: all permissions must be strings');
      }
      parsedPermissions.add(p);
    }

    return UserModel(
      principalId: principalId,
      organizationId: organizationId,
      kind: kind,
      permissions: parsedPermissions,
    );
  }
}
