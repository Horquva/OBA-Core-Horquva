import '../models/decision.dart';

/// Repository for Decisions — the single place that knows WHERE the data comes
/// from.
///
/// The ViewModel talks to this class, not to a server/database directly. Right
/// now it returns demo data; later you only change THIS file to fetch from a
/// real backend.
class DecisionsRepository {
  /// Fetches all decisions that need attention.
  Future<List<Decision>> fetchDecisions() async {
    await Future<void>.delayed(const Duration(milliseconds: 600));

    // Imitates a server/database JSON response. Replace with a real call later.
    const response = <Map<String, dynamic>>[
      {
        'id': '1',
        'priority': 'urgent',
        'title': 'Approve Q3 Investment Plan',
        'impact': 'High',
        'action': 'Requires your decision',
        'due': 'Today, 02:00 PM',
      },
      {
        'id': '2',
        'priority': 'high',
        'title': 'Vendor Risk Assessment',
        'impact': 'High',
        'action': 'Requires your review',
        'due': 'Tomorrow, 11:00 AM',
      },
      {
        'id': '3',
        'priority': 'high',
        'title': 'Policy Exception Request',
        'impact': 'Medium',
        'action': 'Requires approval',
        'due': 'Tomorrow, 04:00 PM',
      },
      {
        'id': '4',
        'priority': 'medium',
        'title': 'Marketing Budget Reallocation',
        'impact': 'Medium',
        'action': 'For approval',
        'due': 'May 18, 10:00 AM',
      },
      {
        'id': '5',
        'priority': 'medium',
        'title': 'New Hiring Request',
        'impact': 'Low',
        'action': 'For approval',
        'due': 'May 19, 09:00 AM',
      },
    ];

    return response.map(Decision.fromJson).toList();
  }
}
