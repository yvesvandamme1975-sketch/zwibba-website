CREATE TABLE "VerificationAttempt" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "phoneNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VerificationAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VerificationAttempt_phoneNumber_status_idx"
ON "VerificationAttempt"("phoneNumber", "status");
