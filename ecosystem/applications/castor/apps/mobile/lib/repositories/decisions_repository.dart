import '../models/decision.dart';
import '../models/decision_detail.dart';

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

  /// Fetches the full details of one decision by its [id].
  Future<DecisionDetail> fetchDecisionDetail(String id) async {
    await Future<void>.delayed(const Duration(milliseconds: 500));

    const detailsById = <String, Map<String, dynamic>>{
      '1': {
        'id': '1',
        'priority': 'urgent',
        'title': 'Approve Q3 Investment Plan',
        'dueLabel': 'Today, 02:00 PM',
        'description':
            'The investment plan includes strategic initiatives across product, technology, and market expansion.',
        'impact': 'High',
        'priorityText': 'Urgent',
        'businessArea': 'Strategy',
        'owner': 'Michael Anderson',
        'estimatedValue': '\$2.4M',
        'summary':
            'This plan will enable key capabilities and accelerate growth in priority markets.',
      },
      '2': {
        'id': '2',
        'priority': 'high',
        'title': 'Vendor Risk Assessment',
        'dueLabel': 'Tomorrow, 11:00 AM',
        'description':
            'A full review of a key vendor after a recent service disruption impacting dependent systems.',
        'impact': 'High',
        'priorityText': 'High',
        'businessArea': 'Operations',
        'owner': 'Sarah Lee',
        'estimatedValue': '\$0.9M',
        'summary':
            'Approving the assessment protects continuity and reduces exposure to vendor failures.',
      },
      '3': {
        'id': '3',
        'priority': 'high',
        'title': 'Policy Exception Request',
        'dueLabel': 'Tomorrow, 04:00 PM',
        'description':
            'A request to grant a temporary exception to the standard procurement policy.',
        'impact': 'Medium',
        'priorityText': 'High',
        'businessArea': 'Compliance',
        'owner': 'David Kim',
        'estimatedValue': '\$0.3M',
        'summary':
            'The exception unblocks a time-sensitive purchase while staying within risk limits.',
      },
      '4': {
        'id': '4',
        'priority': 'medium',
        'title': 'Marketing Budget Reallocation',
        'dueLabel': 'May 18, 10:00 AM',
        'description':
            'Shift a portion of the marketing budget toward higher-performing regional channels.',
        'impact': 'Medium',
        'priorityText': 'Medium',
        'businessArea': 'Marketing',
        'owner': 'Emily Carter',
        'estimatedValue': '\$0.6M',
        'summary':
            'Reallocating funds improves return on spend in the strongest markets.',
      },
      '5': {
        'id': '5',
        'priority': 'medium',
        'title': 'New Hiring Request',
        'dueLabel': 'May 19, 09:00 AM',
        'description':
            'A request to open three new roles to support the growing operations team.',
        'impact': 'Low',
        'priorityText': 'Medium',
        'businessArea': 'People',
        'owner': 'James Wilson',
        'estimatedValue': '\$0.4M',
        'summary':
            'Adding capacity keeps delivery on track as workload increases.',
      },
    };

    final json = detailsById[id];
    if (json == null) {
      throw Exception('Decision $id not found');
    }
    return DecisionDetail.fromJson(json);
  }
}
