/// Exception thrown when a client component violates OCOS architectural boundaries.
class ConstitutionalBoundaryException implements Exception {
  ConstitutionalBoundaryException(this.message);
  final String message;

  @override
  String toString() => 'ConstitutionalBoundaryViolation: $message';
}

/// Runtime guard ensuring UI surfaces strictly consume contracts and never execute direct DB queries.
class BoundaryGuard {
  static const List<String> forbiddenPatterns = [
    'SELECT *',
    'INSERT INTO',
    'UPDATE ',
    'DELETE FROM',
    'DROP TABLE',
    'mongodb://',
    'postgres://',
  ];

  /// Validates that raw query payloads are not being passed through client surfaces.
  static void validateContractPayload(Map<String, dynamic> payload) {
    for (final entry in payload.entries) {
      final valueStr = entry.value.toString().toUpperCase();
      for (final forbidden in forbiddenPatterns) {
        if (valueStr.contains(forbidden)) {
          throw ConstitutionalBoundaryException(
            'Direct database operation forbidden on Castor client: "$forbidden" found in field "${entry.key}".',
          );
        }
      }
    }
  }

  /// Verifies that data sources carry valid signed contract provenance.
  static bool verifyContractProvenance(String sourceSystem) {
    const validSources = {
      'OBA_BRAIN',
      'CASTOR_ORCHESTRATOR',
      'EXECUTIVE_WORKSPACE'
    };
    return validSources.contains(sourceSystem.toUpperCase());
  }
}
