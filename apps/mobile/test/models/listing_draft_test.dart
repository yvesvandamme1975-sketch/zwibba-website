import 'package:flutter_test/flutter_test.dart';
import 'package:zwibba_mobile/models/listing_draft.dart';

void main() {
  test('listing draft ignores legacy ai price fields when parsing json', () {
    final draft = ListingDraft.fromJson({
      'area': 'Bel Air',
      'categoryId': 'phones_tablets',
      'condition': 'like_new',
      'description': 'Téléphone propre.',
      'guidancePrompts': ['Face', 'Dos'],
      'photos': const [],
      'priceCdf': '4256000',
      'suggestedPriceMaxCdf': 4500000,
      'suggestedPriceMinCdf': 3900000,
      'title': 'Samsung Galaxy A54 128 Go',
    });

    expect(draft.priceCdf, '4256000');
    expect(draft.toJson().containsKey('suggestedPriceMinCdf'), isFalse);
    expect(draft.toJson().containsKey('suggestedPriceMaxCdf'), isFalse);
  });
}
