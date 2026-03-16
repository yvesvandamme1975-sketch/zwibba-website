CREATE TABLE "Draft" (
  "id" TEXT NOT NULL,
  "area" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "condition" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "description" TEXT NOT NULL,
  "ownerPhoneNumber" TEXT NOT NULL,
  "priceCdf" INTEGER NOT NULL,
  "syncStatus" TEXT NOT NULL DEFAULT 'synced',
  "title" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DraftPhoto" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "draftId" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "publicUrl" TEXT NOT NULL,
  "sourcePresetId" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "uploadStatus" TEXT NOT NULL,

  CONSTRAINT "DraftPhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Draft_ownerPhoneNumber_idx" ON "Draft"("ownerPhoneNumber");
CREATE INDEX "DraftPhoto_draftId_idx" ON "DraftPhoto"("draftId");

ALTER TABLE "DraftPhoto"
ADD CONSTRAINT "DraftPhoto_draftId_fkey"
FOREIGN KEY ("draftId") REFERENCES "Draft"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
