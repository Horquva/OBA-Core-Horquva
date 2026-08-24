import '../models/signal.dart';

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
    await Future<void>.delayed(const Duration(milliseconds: 600));

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
      },
      {
        'id': '2',
        'severity': 'important',
        'time': '07:45 AM',
        'title': 'Q2 revenue forecast updated',
        'description':
            'Finance team updated the forecast. Impact expected on regional allocations.',
        'tags': ['Finance', 'Planning'],
      },
      {
        'id': '3',
        'severity': 'important',
        'time': '07:30 AM',
        'title': 'Cybersecurity threat detected',
        'description':
            'Suspicious login attempts detected from unusual geographic locations.',
        'tags': ['Security', 'Threat'],
      },
      {
        'id': '4',
        'severity': 'informational',
        'time': '06:50 AM',
        'title': 'Employee sentiment improved',
        'description':
            'Monthly sentiment score increased by 6% across the organization.',
        'tags': ['People'],
      },
    ];

    // Turn each JSON map into a Signal object.
    return response.map(Signal.fromJson).toList();
  }
}
