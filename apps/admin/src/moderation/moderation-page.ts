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
    <li data-moderation-item="${escapeHtml(item.id)}" data-status="${escapeHtml(item.status)}">
      <strong>${escapeHtml(item.listingTitle)}</strong>
      <span>Seller: ${escapeHtml(item.sellerPhoneNumber)}</span>
      <span>Status: ${escapeHtml(formatStatus(item.status))}</span>
      <span>Reason: ${escapeHtml(item.reasonSummary)}</span>
      <form method="post" action="/moderation/${escapeHtml(item.id)}/approve">
        <button type="submit">Approuver</button>
      </form>
      <form method="post" action="/moderation/${escapeHtml(item.id)}/block">
        <label>
          <span>Raison</span>
          <input type="text" name="reasonSummary" value="${escapeHtml(item.reasonSummary)}" />
        </label>
        <button type="submit">Bloquer</button>
      </form>
    </li>
  `;
}

export function renderModerationPage({
  items,
}: {
  items: ModerationQueueItem[];
}) {
  const queueMarkup =
    items.length === 0
      ? '<li>Aucune annonce en revue pour le moment.</li>'
      : items.map(renderQueueItem).join('');

  return `
    <section>
      <header>
        <p>Zwibba moderation</p>
        <h1>Pending moderation queue</h1>
      </header>
      <ul>
        ${queueMarkup}
      </ul>
    </section>
  `;
}
