import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('Castor App renders successfully', (WidgetTester tester) async {
    await tester.pumpWidget(const CastorApp());

    expect(find.byType(CastorApp), findsOneWidget);
  });
}
