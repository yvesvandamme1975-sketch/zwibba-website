CREATE TABLE "SupportConversation" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastInboundAt" TIMESTAMP(3),
  "pendingActionJson" JSONB,
  "status" TEXT NOT NULL DEFAULT 'open',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "waId" TEXT NOT NULL,

  CONSTRAINT "SupportConversation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportConversation_waId_key" ON "SupportConversation"("waId");

CREATE TABLE "SupportMessage" (
  "id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "role" TEXT NOT NULL,

  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportMessage_conversationId_idx" ON "SupportMessage"("conversationId");

ALTER TABLE "SupportMessage"
ADD CONSTRAINT "SupportMessage_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

CREATE TABLE "SupportActionLog" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "matchedPhoneNumber" TEXT,
  "outcome" TEXT NOT NULL,
  "payloadJson" JSONB,
  "targetId" TEXT,
  "waId" TEXT NOT NULL,

  CONSTRAINT "SupportActionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportActionLog_waId_idx" ON "SupportActionLog"("waId");
