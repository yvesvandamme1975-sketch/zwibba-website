export type ModerationStatus =
  | 'approved'
  | 'blocked_needs_fix'
  | 'pending_manual_review';

export type ModerationMarketCountryCode = 'BE' | 'CD';

export type ModerationQueueItem = {
  id: string;
  listingTitle: string;
  reasonSummary: string;
  sellerPhoneNumber: string;
  status: ModerationStatus;
};

const marketTabs: Array<{ countryCode: ModerationMarketCountryCode; label: string }> = [
  { countryCode: 'CD', label: 'RDC' },
  { countryCode: 'BE', label: 'Belgique' },
];

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

function renderMarketTabs(activeCountryCode: ModerationMarketCountryCode) {
  const tabsMarkup = marketTabs
    .map(({ countryCode, label }) => {
      const isActive = countryCode === activeCountryCode;
      const style = isActive
        ? 'font-weight: bold; text-decoration: underline;'
        : 'font-weight: normal; text-decoration: none;';

      return `<a href="/moderation?countryCode=${countryCode}" aria-current="${isActive ? 'page' : 'false'}" style="${style}">${label}</a>`;
    })
    .join('\n        ');

  return `
      <nav aria-label="Marchés">
        ${tabsMarkup}
      </nav>
  `;
}

export function renderModerationPage(
  {
    items,
  }: {
    items: ModerationQueueItem[];
  },
  countryCode: ModerationMarketCountryCode = 'CD',
) {
  const queueMarkup =
    items.length === 0
      ? '<li>Aucune annonce en revue pour le moment.</li>'
      : items.map(renderQueueItem).join('');

  return `
    <section>
      <header>
        <p>Zwibba moderation</p>
        <h1>Pending moderation queue</h1>
        ${renderMarketTabs(countryCode)}
      </header>
      <ul>
        ${queueMarkup}
      </ul>
    </section>
  `;
}
