import 'package:flutter/widgets.dart';

import '../models/chat_message.dart';
import '../repositories/ask_castor_repository.dart';

/// ViewModel for the Ask Castor screen.
///
/// Holds the input, the conversation, and the suggested prompts. Sending goes
/// through [AskCastorRepository] (a demo reply for now; real bot endpoint
/// later).
class AskCastorViewModel extends ChangeNotifier {
  AskCastorViewModel({AskCastorRepository? repository})
      : _repository = repository ?? AskCastorRepository();

  final AskCastorRepository _repository;

  /// The text the user is typing.
  final TextEditingController input = TextEditingController();

  /// The conversation so far.
  final List<ChatMessage> messages = [];

  /// True while waiting for the assistant's reply.
  bool sending = false;

  /// Suggested starter prompts (demo).
  final List<String> suggestions = const [
    'What are the top risks today?',
    'Show me critical signals',
    'How is our performance trending?',
  ];

  bool get hasMessages => messages.isNotEmpty;

  /// Sends whatever is in the input box.
  Future<void> send() => _sendText(input.text);

  /// Sends a specific prompt (e.g. a tapped suggestion).
  Future<void> sendPrompt(String prompt) => _sendText(prompt);

  Future<void> _sendText(String raw) async {
    final text = raw.trim();
    if (text.isEmpty || sending) return;

    // Add the user's message and clear the input.
    messages.add(ChatMessage(role: ChatRole.user, text: text));
    input.clear();
    sending = true;
    notifyListeners();

    try {
      final reply = await _repository.sendMessage(text);
      messages.add(ChatMessage(role: ChatRole.assistant, text: reply));
    } catch (e) {
      messages.add(const ChatMessage(
        role: ChatRole.assistant,
        text: 'Sorry, something went wrong. Please try again.',
      ));
    } finally {
      sending = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    input.dispose();
    super.dispose();
  }
}
