export type ModerationStatus =
  | 'approved'
  | 'blocked_needs_fix'
  | 'pending_manual_review';

export type ModerationQueueItem = {
  id: string;
  listingTitle: string;
  reasonSummary: string;
  sellerPhoneNumber: string;
  status: ModerationStatus;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatStatus(status: ModerationStatus) {
  return status.replaceAll('_', ' ');
}

function renderQueueItem(item: ModerationQueueItem) {
  return `
    <li data-moderation-item="${escapeHtml(item.id)}">
      <strong>${escapeHtml(item.listingTitle)}</strong>
      <span>Seller: ${escapeHtml(item.sellerPhoneNumber)}</span>
      <span>Status: ${escapeHtml(formatStatus(item.status))}</span>
      <span>Reason: ${escapeHtml(item.reasonSummary)}</span>
    </li>
  `;
}

export function renderModerationPage({
  items,
}: {
  items: ModerationQueueItem[];
}) {
  return `
    <section>
      <header>
        <p>Zwibba moderation</p>
        <h1>Pending moderation queue</h1>
      </header>
      <ul>
        ${items.map(renderQueueItem).join('')}
      </ul>
    </section>
  `;
}
