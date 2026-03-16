import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/app.dart';

void main() {
  testWidgets('seller-first home shows the primary post CTA', (tester) async {
    await tester.pumpWidget(const ZwibbaApp());

    expect(
        find.widgetWithText(FilledButton, 'Prendre une photo'), findsOneWidget);
    expect(find.text('Continuer mon brouillon'), findsNothing);
    expect(find.text('Le parcours vendeur commence ici.'), findsOneWidget);
  });
}
