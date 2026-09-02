/// Repository for the Ask Castor AI chat.
///
/// The ViewModel calls [sendMessage] instead of talking to the bot directly.
/// Right now it returns a DEMO reply. Later, replace the body of [sendMessage]
/// with your real bot endpoint call — the ViewModel and screen stay the same.
class AskCastorRepository {
  /// Sends a [prompt] and returns the assistant's reply.
  Future<String> sendMessage(String prompt) async {
    // Pretend we are calling the bot endpoint.
    await Future<void>.delayed(const Duration(milliseconds: 900));

    // DEMO response. Swap this for the real endpoint call later.
    return 'This is a demo response. Once the AI endpoint is connected, '
        'you\'ll get a real answer to: "$prompt".';
  }
}
