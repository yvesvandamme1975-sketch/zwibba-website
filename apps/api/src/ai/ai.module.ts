import { Module } from '@nestjs/common';

import { loadEnv } from '../config/env';
import { AnthropicVisionDraftProvider } from './anthropic-vision-draft-provider';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { FallbackVisionDraftProvider } from './fallback-vision-draft-provider';
import { GeminiVisionDraftProvider } from './gemini-vision-draft-provider';
import { MistralVisionDraftProvider } from './mistral-vision-draft-provider';
import { VISION_DRAFT_PROVIDER, VisionDraftProvider } from './vision-draft-provider';

function createStubVisionDraftProvider(): VisionDraftProvider {
  return {
    async generateDraftFromImage({ photoUrl }) {
      const normalizedUrl = String(photoUrl || '').toLowerCase();

      if (
        normalizedUrl.includes('phone') ||
        normalizedUrl.includes('samsung') ||
        normalizedUrl.includes('galaxy')
      ) {
        return {
          categoryId: 'phones_tablets',
          condition: 'like_new',
          description: 'Téléphone propre, version 128 Go, batterie stable et prêt à l’emploi.',
          title: 'Samsung Galaxy A54 128 Go',
        };
      }

      if (
        normalizedUrl.includes('vehicle') ||
        normalizedUrl.includes('toyota') ||
        normalizedUrl.includes('hilux') ||
        normalizedUrl.includes('rav4')
      ) {
        return {
          categoryId: 'vehicles',
          condition: 'used_good',
          description: 'Véhicule propre avec présentation claire et usage normal.',
          title: 'Toyota RAV4 automatique',
        };
      }

      if (
        normalizedUrl.includes('sofa') ||
        normalizedUrl.includes('canape') ||
        normalizedUrl.includes('canapé')
      ) {
        return {
          categoryId: 'home_garden',
          condition: 'used_good',
          description: 'Canapé confortable, tissu propre, parfait pour salon.',
          title: 'Canapé trois places',
        };
      }

      return {
        categoryId: 'electronics',
        condition: 'used_good',
        description: 'Article visible, descriptif initial généré par IA.',
        title: 'Annonce préparée par IA',
      };
    },
  };
}

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    {
      provide: VISION_DRAFT_PROVIDER,
      useFactory() {
        const env = loadEnv();

        if (env.ai.provider === 'multi' && env.ai.gemini) {
          const providers: VisionDraftProvider[] = [
            new GeminiVisionDraftProvider({
              apiKey: env.ai.gemini.apiKey,
              model: env.ai.gemini.model,
            }),
          ];

          if (env.ai.anthropic) {
            providers.push(
              new AnthropicVisionDraftProvider({
                apiKey: env.ai.anthropic.apiKey,
                model: env.ai.anthropic.model,
              }),
            );
          }

          if (env.ai.mistral) {
            providers.push(
              new MistralVisionDraftProvider({
                apiKey: env.ai.mistral.apiKey,
                model: env.ai.mistral.model,
              }),
            );
          }

          return new FallbackVisionDraftProvider(providers);
        }

        return createStubVisionDraftProvider();
      },
    },
  ],
})
export class AiModule {}
