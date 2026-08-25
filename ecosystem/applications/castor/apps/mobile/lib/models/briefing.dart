/// The kind of a key takeaway (drives its icon).
enum TakeawayKind { risk, changes, performance }

/// One "Key Takeaway" line in the briefing.
class BriefingTakeaway {
  const BriefingTakeaway({required this.kind, required this.text});
  final TakeawayKind kind;
  final String text;

  factory BriefingTakeaway.fromJson(Map<String, dynamic> json) {
    return BriefingTakeaway(
      kind: _takeawayKindFromString(json['kind'] as String),
      text: json['text'] as String,
    );
  }
}

TakeawayKind _takeawayKindFromString(String value) {
  switch (value) {
    case 'risk':
      return TakeawayKind.risk;
    case 'changes':
      return TakeawayKind.changes;
    default:
      return TakeawayKind.performance;
  }
}

/// The Executive Briefing (Summary tab) — plain data from the backend.
class Briefing {
  const Briefing({
    required this.dateLabel,
    required this.performanceLabel,
    required this.performanceCaption,
    required this.score,
    required this.scoreMax,
    required this.takeaways,
    required this.focusTitle,
    required this.focusMeta,
  });

  final String dateLabel; // "Today, 08:42 AM"
  final String performanceLabel; // "Strong"
  final String performanceCaption; // "All critical domains are under control."
  final int score; // 92
  final int scoreMax; // 100
  final List<BriefingTakeaway> takeaways;
  final String focusTitle; // "Vendor dependency risk"
  final String focusMeta; // "High impact • Likely probability"

  factory Briefing.fromJson(Map<String, dynamic> json) {
    return Briefing(
      dateLabel: json['dateLabel'] as String,
      performanceLabel: json['performanceLabel'] as String,
      performanceCaption: json['performanceCaption'] as String,
      score: json['score'] as int,
      scoreMax: json['scoreMax'] as int,
      takeaways: (json['takeaways'] as List<dynamic>)
          .map((e) => BriefingTakeaway.fromJson(e as Map<String, dynamic>))
          .toList(),
      focusTitle: json['focusTitle'] as String,
      focusMeta: json['focusMeta'] as String,
    );
  }
}
