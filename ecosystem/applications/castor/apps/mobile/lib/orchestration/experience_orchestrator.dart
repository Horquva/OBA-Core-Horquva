import 'dart:async';
import '../contracts/experience_models.dart';

/// Composed view model combining briefings, recommendations, and live signals.
class ComposedExecutiveExperience {
  final ExecutiveBriefingDTO briefing;
  final List<AIRecommendationDTO> recommendations;
  final List<SignalDTO> signals;
  final DateTime composedAt;

  const ComposedExecutiveExperience({
    required this.briefing,
    required this.recommendations,
    required this.signals,
    required this.composedAt,
  });
}

/// Orchestrates multi-surface outputs into a single reactive experience stream.
class ExperienceOrchestrator {
  final _experienceController =
      StreamController<ComposedExecutiveExperience>.broadcast();
  ComposedExecutiveExperience? _latestExperience;

  Stream<ComposedExecutiveExperience> get experienceStream =>
      _experienceController.stream;
  ComposedExecutiveExperience? get latestExperience => _latestExperience;

  /// Composes incoming raw contracts into a unified executive view model.
  void composeExperience({
    required ExecutiveBriefingDTO briefing,
    required List<AIRecommendationDTO> recommendations,
    required List<SignalDTO> signals,
  }) {
    final composed = ComposedExecutiveExperience(
      briefing: briefing,
      recommendations: recommendations,
      signals: signals,
      composedAt: DateTime.now(),
    );

    _latestExperience = composed;
    _experienceController.add(composed);
  }

  void dispose() {
    _experienceController.close();
  }
}
