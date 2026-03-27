ALTER TABLE "User"
ADD COLUMN "birthDate" TEXT,
ADD COLUMN "countryCode" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "locality" TEXT,
ADD COLUMN "postNom" TEXT,
ADD COLUMN "profileCompletedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "AuthIdentity" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "phoneNumber" TEXT,
  "provider" TEXT NOT NULL,
  "providerEmail" TEXT,
  "providerSubject" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3),

  CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuthIdentity_userId_idx" ON "AuthIdentity"("userId");
CREATE UNIQUE INDEX "AuthIdentity_provider_providerSubject_key"
ON "AuthIdentity"("provider", "providerSubject");

ALTER TABLE "AuthIdentity"
ADD CONSTRAINT "AuthIdentity_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
