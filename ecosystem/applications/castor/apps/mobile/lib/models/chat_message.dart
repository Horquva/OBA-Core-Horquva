/// Who sent a chat message.
enum ChatRole { user, assistant }

/// One message in the Ask Castor conversation.
class ChatMessage {
  const ChatMessage({required this.role, required this.text});
  final ChatRole role;
  final String text;
}
