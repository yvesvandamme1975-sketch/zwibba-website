-- CreateTable
CREATE TABLE "SearchQueryEvent" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "rawQuery" TEXT NOT NULL,
    "normalizedQuery" TEXT NOT NULL,
    "selectedCategoryId" TEXT NOT NULL DEFAULT '',
    "resultCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchQueryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingPriceEvent" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "listingId" TEXT,
    "previousAmount" INTEGER,
    "previousCurrency" TEXT,
    "nextAmount" INTEGER NOT NULL,
    "nextCurrency" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingPriceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchQueryEvent_countryCode_createdAt_idx" ON "SearchQueryEvent"("countryCode", "createdAt");

-- CreateIndex
CREATE INDEX "SearchQueryEvent_countryCode_normalizedQuery_idx" ON "SearchQueryEvent"("countryCode", "normalizedQuery");

-- CreateIndex
CREATE INDEX "ListingPriceEvent_countryCode_createdAt_idx" ON "ListingPriceEvent"("countryCode", "createdAt");

-- CreateIndex
CREATE INDEX "ListingPriceEvent_draftId_createdAt_idx" ON "ListingPriceEvent"("draftId", "createdAt");

-- CreateIndex
CREATE INDEX "ListingPriceEvent_listingId_createdAt_idx" ON "ListingPriceEvent"("listingId", "createdAt");
