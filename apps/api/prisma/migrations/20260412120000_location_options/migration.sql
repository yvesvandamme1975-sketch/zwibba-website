CREATE TABLE "LocationOption" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label" TEXT NOT NULL,
    "normalizedLabel" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationOption_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LocationOption_countryCode_type_status_idx" ON "LocationOption"("countryCode", "type", "status");

CREATE UNIQUE INDEX "LocationOption_countryCode_type_normalizedLabel_key" ON "LocationOption"("countryCode", "type", "normalizedLabel");
