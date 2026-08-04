ALTER TABLE "User" ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'CD';
ALTER TABLE "Draft" ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'CD';
ALTER TABLE "Listing" ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'CD';
CREATE INDEX "Listing_countryCode_idx" ON "Listing"("countryCode");
