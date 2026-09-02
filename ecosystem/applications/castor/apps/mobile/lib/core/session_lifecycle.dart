import 'dart:async';

/// Represents the active state of an executive session.
enum SessionState {
  unauthenticated,
  initializing,
  active,
  backgroundSync,
  expired,
  terminated
}

/// Manages reactive session transitions, periodic sync, and memory lifecycle.
class SessionLifecycle {
  SessionLifecycle({this.syncInterval = const Duration(minutes: 5)}) {
    _stateController = StreamController<SessionState>.broadcast();
    _currentState = SessionState.unauthenticated;
  }

  final Duration syncInterval;
  late final StreamController<SessionState> _stateController;
  Timer? _syncTimer;
  SessionState _currentState = SessionState.unauthenticated;
  DateTime? _lastSyncTimestamp;

  Stream<SessionState> get sessionStream => _stateController.stream;
  SessionState get currentState => _currentState;
  DateTime? get lastSyncTimestamp => _lastSyncTimestamp;

  /// Initializes an authenticated session.
  Future<void> startSession(String userId) async {
    _transition(SessionState.initializing);
    // Simulate runtime handshake & memory allocation
    await Future<void>.delayed(const Duration(milliseconds: 50));
    _transition(SessionState.active);
    _startPeriodicSync();
  }

  /// Triggers background data synchronization.
  Future<void> triggerBackgroundSync() async {
    if (_currentState != SessionState.active) return;
    _transition(SessionState.backgroundSync);

    // Perform sync operations
    await Future<void>.delayed(const Duration(milliseconds: 30));
    _lastSyncTimestamp = DateTime.now();
    _transition(SessionState.active);
  }

  /// Terminates the session and cleans up resources.
  void terminateSession() {
    _syncTimer?.cancel();
    _syncTimer = null;
    _transition(SessionState.terminated);
  }

  void _startPeriodicSync() {
    _syncTimer?.cancel();
    _syncTimer = Timer.periodic(syncInterval, (_) => triggerBackgroundSync());
  }

  void _transition(SessionState newState) {
    _currentState = newState;
    _stateController.add(_currentState);
  }

  void dispose() {
    _syncTimer?.cancel();
    _stateController.close();
  }
}
