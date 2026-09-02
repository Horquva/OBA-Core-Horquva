import '../models/signal.dart';
import '../models/signal_detail.dart';

/// Repository for Signals — the single place that knows WHERE the data comes
/// from.
///
/// The ViewModel talks to this class instead of talking to a server/database
/// directly. Right now it returns demo data. To use a real backend later, you
/// only change THIS file (fetch over HTTP or read from a database) — the
/// ViewModel and the screen do not change.
class SignalsRepository {
  /// Fetches all signals.
  ///
  /// Demo: waits a moment (to imitate a network call) and returns sample data.
  /// The sample is written as JSON maps so it looks exactly like a real
  /// server response; each map is parsed with [Signal.fromJson].
  Future<List<Signal>> fetchSignals() async {
    // Pretend we are calling a server.
    await Future<void>.delayed(const Duration(milliseconds: 100));

    // This imitates the JSON a server (or database) would return. Replace this
    // block with a real HTTP/database call that returns the same shape.
    const response = <Map<String, dynamic>>[
      {
        'id': '1',
        'severity': 'critical',
        'time': '08:12 AM',
        'title': 'Vendor dependency risk increased',
        'description':
            'A key vendor experienced a service disruption impacting 3 dependent systems.',
        'tags': ['Operations', 'Risk'],
        'impact': 'High',
        'probability': 'Likely',
      },
      {
        'id': '2',
        'severity': 'important',
        'time': '07:45 AM',
        'title': 'Q2 revenue forecast updated',
        'description':
            'Finance team updated the forecast. Impact expected on regional allocations.',
        'tags': ['Finance', 'Planning'],
        'impact': 'Medium',
        'probability': 'Likely',
      },
      {
        'id': '3',
        'severity': 'important',
        'time': '07:30 AM',
        'title': 'Cybersecurity threat detected',
        'description':
            'Suspicious login attempts detected from unusual geographic locations.',
        'tags': ['Security', 'Threat'],
        'impact': 'Medium',
        'probability': 'Possible',
      },
      {
        'id': '4',
        'severity': 'informational',
        'time': '06:50 AM',
        'title': 'Employee sentiment improved',
        'description':
            'Monthly sentiment score increased by 6% across the organization.',
        'tags': ['People'],
        'impact': 'Low',
        'probability': 'Confirmed',
      },
    ];

    // Turn each JSON map into a Signal object.
    return response.map(Signal.fromJson).toList();
  }

  /// Fetches the full details of one signal by its [id].
  ///
  /// Demo: looks the id up in sample data. With a real backend you would call
  /// something like GET /signals/{id} here and parse the response.
  Future<SignalDetail> fetchSignalDetail(String id) async {
    await Future<void>.delayed(const Duration(milliseconds: 500));

    // Sample detail data keyed by signal id (imitates a server response).
    const detailsById = <String, Map<String, dynamic>>{
      '1': {
        'id': '1',
        'severity': 'critical',
        'title': 'Vendor dependency risk increased',
        'dateLabel': 'Today, 08:12 AM',
        'summary':
            'A key vendor experienced a service disruption impacting 3 dependent systems. The risk score increased by 35% compared to yesterday.',
        'category': 'Risk',
        'domain': 'Operations',
        'impact': 'High',
        'probability': 'Likely',
        'relatedSystems': '3 systems',
        'whatHappened':
            'The vendor reported performance degradation in their primary data center resulting in intermittent service across dependent systems.',
      },
      '2': {
        'id': '2',
        'severity': 'important',
        'title': 'Q2 revenue forecast updated',
        'dateLabel': 'Today, 07:45 AM',
        'summary':
            'Finance team updated the Q2 forecast. Impact is expected on regional allocations and planning.',
        'category': 'Planning',
        'domain': 'Finance',
        'impact': 'Medium',
        'probability': 'Likely',
        'relatedSystems': '2 systems',
        'whatHappened':
            'Updated inputs from regional teams changed the revenue outlook, prompting a revision of the quarterly forecast.',
      },
      '3': {
        'id': '3',
        'severity': 'important',
        'title': 'Cybersecurity threat detected',
        'dateLabel': 'Today, 07:30 AM',
        'summary':
            'Suspicious login attempts were detected from unusual geographic locations across several accounts.',
        'category': 'Threat',
        'domain': 'Security',
        'impact': 'Medium',
        'probability': 'Possible',
        'relatedSystems': '5 systems',
        'whatHappened':
            'Automated monitoring flagged repeated failed logins from new locations, matching a known credential-stuffing pattern.',
      },
      '4': {
        'id': '4',
        'severity': 'informational',
        'title': 'Employee sentiment improved',
        'dateLabel': 'Today, 06:50 AM',
        'summary':
            'The monthly sentiment score increased by 6% across the organization.',
        'category': 'Culture',
        'domain': 'People',
        'impact': 'Low',
        'probability': 'Confirmed',
        'relatedSystems': '1 system',
        'whatHappened':
            'The latest engagement survey showed higher scores in work-life balance and team collaboration.',
      },
    };

    final json = detailsById[id];
    if (json == null) {
      throw Exception('Signal $id not found');
    }
    return SignalDetail.fromJson(json);
  }
}
