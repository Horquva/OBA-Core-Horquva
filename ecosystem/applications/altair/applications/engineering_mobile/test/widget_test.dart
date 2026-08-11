import 'package:flutter_test/flutter_test.dart';

import 'package:horquva_mobile_app/main.dart';

void main() {
  testWidgets('App loads without errors', (WidgetTester tester) async {
    await tester.pumpWidget(const HorquvaApp());
    expect(find.byType(HorquvaApp), findsOneWidget);
  });
}
