import type { PrismaService } from '../database/prisma.service';

export async function canReviewListing(prisma: PrismaService, listingId: string, phoneNumber?: string) {
  if (!phoneNumber) return false;
  return Boolean(await prisma.chatThread.findFirst({
    where: { listingId, buyer: { phoneNumber }, messages: { some: { senderRole: 'buyer' } } },
    select: { id: true },
  }));
}
