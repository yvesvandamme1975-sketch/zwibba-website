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
        title: 'Annonce préparée par IA',
      },
      status: 'ready',
    };
  }
}
