import 'package:flutter_test/flutter_test.dart';
import 'package:sentinel_flutter/core/errors/failures.dart';
import 'package:sentinel_flutter/models/finding_model.dart';
import 'package:sentinel_flutter/models/security_event_model.dart';

void main() {
  group('FindingModel', () {
    test('successfully parses valid JSON', () {
      final json = {
        'finding_id': 'f-123',
        'source': 'sast',
        'repository': 'frontend-app',
        'severity': 'critical',
        'category': 'injection',
        'status': 'detected',
        'detected_at': '2023-10-01T12:00:00Z',
      };

      final model = FindingModel.fromJson(json);

      expect(model.findingId, 'f-123');
      expect(model.source, FindingSource.sast);
      expect(model.severity, FindingSeverity.critical);
    });

    test('throws ParsingFailure on missing required field', () {
      final json = {
        'finding_id': 'f-123',
        // missing 'source'
      };

      expect(
        () => FindingModel.fromJson(json),
        throwsA(isA<ParsingFailure>()),
      );
    });

    test('throws ParsingFailure on invalid enum value', () {
      final json = {
        'finding_id': 'f-123',
        'source': 'invalid_source_type',
        'repository': 'frontend-app',
        'severity': 'critical',
        'category': 'injection',
        'status': 'detected',
        'detected_at': '2023-10-01T12:00:00Z',
      };

      expect(
        () => FindingModel.fromJson(json),
        throwsA(isA<ParsingFailure>()),
      );
    });
  });

  group('SecurityEventModel', () {
    test('successfully parses valid JSON', () {
      final json = {
        'event_id': 'evt-999',
        'event_type': 'authentication_failed',
        'repository': 'backend-api',
        'commit': 'a1b2c3d',
        'timestamp': '2023-10-01T12:05:00Z',
        'decision': 'deny',
      };

      final model = SecurityEventModel.fromJson(json);

      expect(model.eventId, 'evt-999');
      expect(model.decision, 'deny');
    });

    test('throws ParsingFailure on malformed date', () {
      final json = {
        'event_id': 'evt-999',
        'event_type': 'authentication_failed',
        'repository': 'backend-api',
        'commit': 'a1b2c3d',
        'timestamp': 'not-a-valid-date',
        'decision': 'deny',
      };

      expect(
        () => SecurityEventModel.fromJson(json),
        throwsA(isA<ParsingFailure>()),
      );
    });
  });
}
