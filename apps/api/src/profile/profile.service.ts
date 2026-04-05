import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { SessionRecord } from '../auth/auth.service';
import { PrismaService } from '../database/prisma.service';
import { isSupportedProfileArea } from './profile-areas';

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
    const normalizedArea = area.trim();

    if (!normalizedArea) {
      throw new BadRequestException('Choisissez une zone pour votre profil.');
    }

    if (!isSupportedProfileArea(normalizedArea)) {
      throw new BadRequestException('Zone de profil invalide.');
    }

    const user = await this.prismaService.user.update({
      where: {
        phoneNumber: session.phoneNumber,
      },
      data: {
        area: normalizedArea,
      },
    });

    return {
      area: user.area ?? '',
      phoneNumber: user.phoneNumber,
    };
  }
}
