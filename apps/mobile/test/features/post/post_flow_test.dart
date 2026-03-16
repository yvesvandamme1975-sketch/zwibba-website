import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/app.dart';

void main() {
  testWidgets('first photo starts a draft and unlocks the resume CTA',
      (tester) async {
    await tester.pumpWidget(const ZwibbaApp());

    await tester.tap(find.widgetWithText(FilledButton, 'Prendre une photo'));
    await tester.pumpAndSettle();

    expect(find.text('Choisissez une photo de départ'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'Téléphone premium'));
    await tester.pumpAndSettle();

    expect(find.text('Photos guidées'), findsOneWidget);

    await tester.tap(find.text("Retour à l'accueil"));
    await tester.pumpAndSettle();

    expect(find.widgetWithText(FilledButton, 'Continuer mon brouillon'),
        findsOneWidget);
    expect(find.text('Samsung Galaxy A54 128 Go'), findsOneWidget);
  });
}
