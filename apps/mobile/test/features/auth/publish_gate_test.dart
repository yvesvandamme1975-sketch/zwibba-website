import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/app.dart';

void main() {
  testWidgets('otp gate appears only when publish is attempted',
      (tester) async {
    await tester.pumpWidget(const ZwibbaApp());

    expect(find.text('Publiez seulement après vérification'), findsNothing);

    await tester.tap(find.widgetWithText(FilledButton, 'Prendre une photo'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Téléphone premium'));
    await tester.pumpAndSettle();
    await tester
        .tap(find.widgetWithText(FilledButton, 'Continuer vers le brouillon'));
    await tester.pumpAndSettle();

    expect(find.text('Publiez seulement après vérification'), findsNothing);

    await tester.tap(find.widgetWithText(FilledButton, "Publier l'annonce"));
    await tester.pumpAndSettle();

    expect(find.text('Publiez seulement après vérification'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Continuer avec mon numéro'),
        findsOneWidget);
  });
}
