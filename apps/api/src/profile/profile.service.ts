import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { SessionRecord } from '../auth/auth.service';
import { PrismaService } from '../database/prisma.service';
import { normalizeLocationLabel } from '../locations/location-normalization';

@Injectable()
export class ProfileService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async getProfile(session: SessionRecord) {
    const user = await this.prismaService.user.findUnique({
      where: {
        phoneNumber: session.phoneNumber,
      },
    });

    if (!user) {
      throw new NotFoundException('Profil introuvable.');
    }

    return {
      area: user.area ?? '',
      phoneNumber: user.phoneNumber,
    };
  }

  async updateProfile({
    area,
    session,
  }: {
    area: string;
    session: SessionRecord;
  }) {
    const normalizedArea = normalizeLocationLabel(area);

    if (!normalizedArea) {
      throw new BadRequestException('Choisissez une zone pour votre profil.');
    }

    const location = await this.prismaService.locationOption.findUnique({
      where: {
        countryCode_type_normalizedLabel: {
          countryCode: 'CD',
          normalizedLabel: normalizedArea,
          type: 'city',
        },
      },
    });

    if (!location || location.status !== 'active') {
      throw new BadRequestException('Zone de profil invalide.');
    }

    const user = await this.prismaService.user.update({
      where: {
        phoneNumber: session.phoneNumber,
      },
      data: {
        area: location.label,
      },
    });

    return {
      area: user.area ?? '',
      phoneNumber: user.phoneNumber,
    };
  }
}
