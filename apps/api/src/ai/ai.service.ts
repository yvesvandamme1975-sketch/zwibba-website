import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  generateDraft(photoPresetId: string) {
    if (photoPresetId === 'phone-front') {
      return {
        draftPatch: {
          categoryId: 'phones_tablets',
          condition: 'like_new',
          description: 'Téléphone propre, version 128 Go, batterie stable et prêt à l’emploi.',
          suggestedPriceMaxCdf: 4500000,
          suggestedPriceMinCdf: 3900000,
          title: 'Samsung Galaxy A54 128 Go',
        },
        status: 'ready',
      };
    }

    return {
      draftPatch: {
        categoryId: 'electronics',
        condition: 'used_good',
        description: 'Article visible, descriptif initial généré par IA.',
        suggestedPriceMaxCdf: 900000,
        suggestedPriceMinCdf: 600000,
        title: 'Annonce préparée par IA',
      },
      status: 'ready',
    };
  }
}
