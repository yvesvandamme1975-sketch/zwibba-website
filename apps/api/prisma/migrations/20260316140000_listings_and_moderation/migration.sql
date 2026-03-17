CREATE TABLE "Listing" (
  "id" TEXT NOT NULL,
  "area" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "description" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "moderationStatus" TEXT NOT NULL,
  "ownerPhoneNumber" TEXT NOT NULL,
  "priceCdf" INTEGER NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModerationDecision" (
  "id" TEXT NOT NULL,
  "actorLabel" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "listingId" TEXT NOT NULL,
  "reasonSummary" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ModerationDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Listing_draftId_key" ON "Listing"("draftId");
CREATE UNIQUE INDEX "Listing_slug_key" ON "Listing"("slug");
CREATE INDEX "Listing_moderationStatus_idx" ON "Listing"("moderationStatus");
CREATE INDEX "Listing_ownerPhoneNumber_idx" ON "Listing"("ownerPhoneNumber");
CREATE UNIQUE INDEX "ModerationDecision_listingId_key" ON "ModerationDecision"("listingId");
CREATE INDEX "ModerationDecision_status_idx" ON "ModerationDecision"("status");

ALTER TABLE "Listing"
ADD CONSTRAINT "Listing_draftId_fkey"
FOREIGN KEY ("draftId") REFERENCES "Draft"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "ModerationDecision"
ADD CONSTRAINT "ModerationDecision_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
