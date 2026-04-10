ALTER TABLE "Draft"
ADD COLUMN "priceAmount" INTEGER,
ADD COLUMN "priceCurrency" TEXT NOT NULL DEFAULT 'CDF';

UPDATE "Draft"
SET "priceAmount" = "priceCdf"
WHERE "priceAmount" IS NULL;

ALTER TABLE "Draft"
ALTER COLUMN "priceAmount" SET NOT NULL;

ALTER TABLE "Listing"
ADD COLUMN "priceAmount" INTEGER,
ADD COLUMN "priceCurrency" TEXT NOT NULL DEFAULT 'CDF';

UPDATE "Listing"
SET "priceAmount" = "priceCdf"
WHERE "priceAmount" IS NULL;

ALTER TABLE "Listing"
ALTER COLUMN "priceAmount" SET NOT NULL;
