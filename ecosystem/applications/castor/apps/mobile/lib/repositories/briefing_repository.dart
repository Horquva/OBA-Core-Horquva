import '../models/briefing.dart';

/// Repository for the Executive Briefing.
///
/// The ViewModel talks to this class, not to a server/database directly. Right
/// now it returns demo data; later you only change THIS file.
class BriefingRepository {
  Future<Briefing> fetchBriefing() async {
    await Future<void>.delayed(const Duration(milliseconds: 600));

    // Imitates a server/database JSON response.
    const json = <String, dynamic>{
      'dateLabel': 'Today, 08:42 AM',
      'performanceLabel': 'Strong',
      'performanceCaption': 'All critical domains are under control.',
      'score': 92,
      'scoreMax': 100,
      'takeaways': [
        {
          'kind': 'risk',
          'text': '1 critical risk requires your immediate attention.',
        },
        {
          'kind': 'changes',
          'text': '7 important changes could impact your decisions.',
        },
        {
          'kind': 'performance',
          'text':
              'Business performance is trending positive across all regions.',
        },
      ],
      'focusTitle': 'Vendor dependency risk',
      'focusMeta': 'High impact  •  Likely probability',
    };

    return Briefing.fromJson(json);
  }
}
