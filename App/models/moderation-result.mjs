export const moderationDecisions = {
  approved: 'approved',
  blockedNeedsFix: 'blocked_needs_fix',
  pendingManualReview: 'pending_manual_review',
};

export function createModerationResult(decision, reasons = []) {
  return {
    decision,
    reasons,
  };
}
