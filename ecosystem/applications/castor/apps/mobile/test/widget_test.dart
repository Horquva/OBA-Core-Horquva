import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('Castor App smoke test renders main workspace title',
      (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const CastorApp());

    // Verify that workspace title text is rendered.
    expect(find.text('Castor Executive Workspace'), findsOneWidget);
    expect(find.text('Castor v2.0 Workspace Engine'), findsOneWidget);
  });
}
