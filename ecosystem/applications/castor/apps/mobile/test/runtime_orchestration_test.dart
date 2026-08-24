import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/boundary_guards.dart';
import 'package:mobile/core/session_lifecycle.dart';
import 'package:mobile/contracts/experience_models.dart';
import 'package:mobile/contracts/contract_serializer.dart';
import 'package:mobile/orchestration/experience_orchestrator.dart';

void main() {
  group('SessionLifecycle Engine', () {
    test('transitions through initializing, active, and background sync',
        () async {
      final session = SessionLifecycle();
      expect(session.currentState, SessionState.unauthenticated);

      await session.startSession('exec_user_101');
      expect(session.currentState, SessionState.active);

      await session.triggerBackgroundSync();
      expect(session.currentState, SessionState.active);
      expect(session.lastSyncTimestamp, isNotNull);

      session.terminateSession();
      expect(session.currentState, SessionState.terminated);
      session.dispose();
    });
  });

  group('BoundaryGuard Enforcement (C08)', () {
    test('passes on compliant contract payloads', () {
      final payload = {'id': 'rec_1', 'summary': 'Review Q3 Performance'};
      expect(() => BoundaryGuard.validateContractPayload(payload),
          returnsNormally);
    });

    test('throws ConstitutionalBoundaryException on raw SQL injection attempt',
        () {
      final maliciousPayload = {'query': 'SELECT * FROM users'};
      expect(
        () => BoundaryGuard.validateContractPayload(maliciousPayload),
        throwsA(isA<ConstitutionalBoundaryException>()),
      );
    });
  });

  group('ContractSerializer & Orchestrator', () {
    test('serializes and deserializes ExecutiveBriefingDTO accurately', () {
      final json = {
        'id': 'b_001',
        'title': 'Weekly Executive Briefing',
        'summary': 'Revenue target reached 104%',
        'sourceSystem': 'OBA_BRAIN',
        'timestamp': '2026-08-24T10:00:00.000Z',
        'keyTakeaways': ['Takeaway 1', 'Takeaway 2'],
      };

      final briefing = ContractSerializer.briefingFromJson(json);
      expect(briefing.id, 'b_001');
      expect(briefing.keyTakeaways.length, 2);

      final outputJson = ContractSerializer.briefingToJson(briefing);
      expect(outputJson['title'], 'Weekly Executive Briefing');
    });

    test('composes multi-surface executive experiences cleanly', () async {
      final orchestrator = ExperienceOrchestrator();

      final briefing = ExecutiveBriefingDTO(
        id: 'b1',
        title: 'Morning Briefing',
        summary: 'Operations normal',
        sourceSystem: 'OBA_BRAIN',
        timestamp: DateTime.now(),
        keyTakeaways: ['All systems green'],
      );

      const rec = AIRecommendationDTO(
        id: 'r1',
        actionTitle: 'Approve Budget',
        rationale: 'Positive ROI',
        confidenceScore: 0.95,
        requiresHumanApproval: true,
      );

      orchestrator.composeExperience(
        briefing: briefing,
        recommendations: [rec],
        signals: [],
      );

      expect(orchestrator.latestExperience, isNotNull);
      expect(orchestrator.latestExperience!.briefing.title, 'Morning Briefing');
      expect(
          orchestrator.latestExperience!.recommendations.first.confidenceScore,
          0.95);

      orchestrator.dispose();
    });
  });
}
