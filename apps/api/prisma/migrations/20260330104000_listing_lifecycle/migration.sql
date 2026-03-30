ALTER TABLE "Listing"
ADD COLUMN "deletedBySellerAt" TIMESTAMP(3),
ADD COLUMN "deletedReason" TEXT,
ADD COLUMN "lifecycleChangedAt" TIMESTAMP(3),
ADD COLUMN "lifecycleStatus" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN "pausedAt" TIMESTAMP(3),
ADD COLUMN "previousLifecycleStatusBeforeDelete" TEXT,
ADD COLUMN "soldAt" TIMESTAMP(3),
ADD COLUMN "soldChannel" TEXT;

CREATE INDEX "Listing_lifecycleStatus_idx" ON "Listing"("lifecycleStatus");

CREATE TABLE "ListingLifecycleEvent" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorPhoneNumber" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "listingId" TEXT NOT NULL,
  "metadataJson" JSONB,
  "nextStatus" TEXT NOT NULL,
  "previousStatus" TEXT NOT NULL,
  "reasonCode" TEXT,
  "reasonLabel" TEXT,

  CONSTRAINT "ListingLifecycleEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ListingLifecycleEvent_listingId_createdAt_idx" ON "ListingLifecycleEvent"("listingId", "createdAt");

ALTER TABLE "ListingLifecycleEvent"
ADD CONSTRAINT "ListingLifecycleEvent_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
