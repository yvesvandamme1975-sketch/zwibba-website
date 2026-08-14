-- Inbound WhatsApp message idempotency: Meta delivers webhooks at-least-once,
-- so persist the provider message id and make it unique to dedupe replays.
ALTER TABLE "SupportMessage" ADD COLUMN "waMessageId" TEXT;

CREATE UNIQUE INDEX "SupportMessage_waMessageId_key" ON "SupportMessage"("waMessageId");
