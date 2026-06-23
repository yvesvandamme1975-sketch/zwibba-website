CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OtpChallenge_phoneNumber_idx" ON "OtpChallenge"("phoneNumber");
