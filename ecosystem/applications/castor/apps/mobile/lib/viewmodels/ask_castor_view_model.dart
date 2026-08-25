import 'package:flutter/widgets.dart';

/// ViewModel for the Ask Castor screen.
///
/// Holds the input controller and the suggested prompts. Sending a prompt to
/// the real AI is not wired yet (that is the AI Experience owner's contract).
class AskCastorViewModel extends ChangeNotifier {
  /// The text the user is typing.
  final TextEditingController input = TextEditingController();

  /// Suggested starter prompts (demo).
  final List<String> suggestions = const [
    'What are the top risks today?',
    'Show me critical signals',
    'How is our performance trending?',
  ];

  /// Puts a suggestion into the input box.
  void useSuggestion(String prompt) {
    input.text = prompt;
    input.selection = TextSelection.collapsed(offset: prompt.length);
    notifyListeners();
  }

  /// Sends the current prompt. Wired to the AI backend later.
  void send() {
    // AI Experience contract comes later; nothing to do yet.
  }

  @override
  void dispose() {
    input.dispose();
    super.dispose();
  }
}
