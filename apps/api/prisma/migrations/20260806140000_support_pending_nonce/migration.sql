-- Nonce-scoped pending-action consume: an unguessable, per-request nonce is
-- stored alongside pendingActionJson so a confirming request can atomically
-- clear/execute ONLY the exact pending action it read, never a newer one that
-- replaced it between the read and the conditional updateMany.
ALTER TABLE "SupportConversation" ADD COLUMN "pendingActionNonce" TEXT;
