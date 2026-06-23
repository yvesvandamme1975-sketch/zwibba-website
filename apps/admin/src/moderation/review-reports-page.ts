export type ReviewReportQueueItem = {
  commentExcerpt: string;
  createdAt: string;
  id: string;
  rating: number | null;
  reason: string;
  reviewId: string;
  seller: {
    listingSlug: string;
    listingTitle: string;
  };
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderRating(rating: number | null) {
  return rating === null ? 'Non noté' : `${rating}/5`;
}

function renderReviewReportItem(item: ReviewReportQueueItem) {
  return `
    <li data-review-report-item="${escapeHtml(item.id)}" data-review-id="${escapeHtml(item.reviewId)}">
      <strong>${escapeHtml(item.seller.listingTitle)}</strong>
      <span>Annonce: ${escapeHtml(item.seller.listingSlug)}</span>
      <span>Note: ${escapeHtml(renderRating(item.rating))}</span>
      <span>Motif: ${escapeHtml(item.reason)}</span>
      <span>Avis: ${escapeHtml(item.commentExcerpt)}</span>
      <span>Signalé le: ${escapeHtml(item.createdAt)}</span>
      <form method="post" action="/review-reports/${escapeHtml(item.id)}/dismiss">
        <button type="submit">Rejeter le signalement</button>
      </form>
      <form method="post" action="/review-reports/${escapeHtml(item.id)}/remove-review">
        <button type="submit">Supprimer l’avis</button>
      </form>
    </li>
  `;
}

export function renderReviewReportsPage({
  items,
}: {
  items: ReviewReportQueueItem[];
}) {
  const queueMarkup =
    items.length === 0
      ? '<li>Aucun signalement d’avis en attente.</li>'
      : items.map(renderReviewReportItem).join('');

  return `
    <section>
      <header>
        <p>Zwibba moderation</p>
        <h1>Signalements d’avis</h1>
      </header>
      <ul>
        ${queueMarkup}
      </ul>
    </section>
  `;
}
