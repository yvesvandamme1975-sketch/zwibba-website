CREATE TABLE "ChatThread" (
  "id" TEXT NOT NULL,
  "buyerUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "listingId" TEXT NOT NULL,
  "sellerPhoneNumber" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessage" (
  "id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "senderRole" TEXT NOT NULL,
  "sentAtLabel" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,

  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletTransaction" (
  "id" TEXT NOT NULL,
  "amountCdf" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAtLabel" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "userId" TEXT NOT NULL,

  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BoostPurchase" (
  "id" TEXT NOT NULL,
  "amountCdf" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "durationHours" INTEGER NOT NULL,
  "listingId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "walletTransactionId" TEXT NOT NULL,

  CONSTRAINT "BoostPurchase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChatThread_buyerUserId_idx" ON "ChatThread"("buyerUserId");
CREATE INDEX "ChatThread_listingId_idx" ON "ChatThread"("listingId");
CREATE INDEX "ChatThread_sellerPhoneNumber_idx" ON "ChatThread"("sellerPhoneNumber");
CREATE INDEX "ChatMessage_threadId_idx" ON "ChatMessage"("threadId");
CREATE INDEX "WalletTransaction_userId_createdAt_idx" ON "WalletTransaction"("userId", "createdAt");
CREATE INDEX "BoostPurchase_listingId_idx" ON "BoostPurchase"("listingId");
CREATE INDEX "BoostPurchase_userId_createdAt_idx" ON "BoostPurchase"("userId", "createdAt");

ALTER TABLE "ChatThread"
ADD CONSTRAINT "ChatThread_buyerUserId_fkey"
FOREIGN KEY ("buyerUserId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "ChatThread"
ADD CONSTRAINT "ChatThread_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "ChatMessage"
ADD CONSTRAINT "ChatMessage_threadId_fkey"
FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction"
ADD CONSTRAINT "WalletTransaction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "BoostPurchase"
ADD CONSTRAINT "BoostPurchase_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "BoostPurchase"
ADD CONSTRAINT "BoostPurchase_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
