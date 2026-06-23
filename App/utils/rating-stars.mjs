import { escapeHtml } from './rendering.mjs';

function normalizeCount(count) {
  const numeric = Number(count);

  if (!Number.isFinite(numeric) || numeric < 1) {
    return 0;
  }

  return Math.floor(numeric);
}

function normalizeAverage(average) {
  const numeric = Number(average);

  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.min(5, Math.max(0, numeric));
}

export function renderRatingStars({
  average = null,
  count = 0,
} = {}) {
  const ratingCount = normalizeCount(count);
  const ratingAverage = ratingCount > 0 ? normalizeAverage(average) : null;

  if (ratingCount === 0 || ratingAverage == null) {
    const emptyLabel = "Pas encore d'avis";

    return `
      <span class="app-rating app-rating--empty" aria-label="${escapeHtml(emptyLabel)}">
        <span class="app-rating__stars" aria-hidden="true">☆☆☆☆☆</span>
        <span class="app-rating__label">${escapeHtml(emptyLabel)}</span>
      </span>
    `;
  }

  const roundedAverage = Math.round(ratingAverage);
  const stars = `${'★'.repeat(roundedAverage)}${'☆'.repeat(5 - roundedAverage)}`;
  const averageLabel = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(ratingAverage) ? 0 : 1,
  }).format(ratingAverage);
  const countLabel = `${ratingCount} avis`;

  return `
    <span class="app-rating" aria-label="${escapeHtml(`Note ${averageLabel} sur 5, ${countLabel}`)}">
      <span class="app-rating__stars" aria-hidden="true">${escapeHtml(stars)}</span>
      <span class="app-rating__score">${escapeHtml(averageLabel)}</span>
      <span class="app-rating__count">(${escapeHtml(countLabel)})</span>
    </span>
  `;
}
