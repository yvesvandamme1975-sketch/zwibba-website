import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import { escapeAttribute, escapeHtml, formatListingPrice } from '../../utils/rendering.mjs';
import { sanitizeListingImageUrl } from '../../utils/image-fallbacks.mjs';
import { normalizeLocationValueForMatch } from '../../utils/location-search.mjs';
import { sellerMonogram } from '../../utils/seller-monogram.mjs';

function buildCounts(listings) {
  return {
    approved: listings.filter((listing) => listing.moderationStatus === 'approved').length,
    blocked: listings.filter((listing) => listing.moderationStatus === 'blocked_needs_fix').length,
    pending: listings.filter((listing) => listing.moderationStatus === 'pending_manual_review').length,
  };
}

function formatListingStatus(status) {
  switch (status) {
    case 'approved':
      return 'Publiée';
    case 'pending_manual_review':
      return 'En revue';
    case 'blocked_needs_fix':
      return 'À corriger';
    default:
      return 'Brouillon';
  }
}

function groupListingsByLifecycle(listings) {
  return {
    active: listings.filter((listing) => (listing.lifecycleStatus || 'active') === 'active'),
    archived: listings.filter((listing) => listing.lifecycleStatus === 'deleted_by_seller'),
    paused: listings.filter((listing) => listing.lifecycleStatus === 'paused'),
    sold: listings.filter((listing) => listing.lifecycleStatus === 'sold'),
  };
}

function buildLifecycleActionButton({
  action,
  label,
  listing,
  tone = 'secondary',
} = {}) {
  const className =
    tone === 'primary'
      ? 'app-flow__button'
      : 'app-flow__button app-flow__button--secondary';

  return `
    <button
      class="${className}"
      type="button"
      data-action="listing-lifecycle"
      data-lifecycle-action="${escapeAttribute(action)}"
      data-listing-id="${escapeAttribute(listing.id)}"
      data-listing-slug="${escapeAttribute(listing.slug)}"
    >
      ${escapeHtml(label)}
    </button>
  `;
}

function renderLifecycleButtons(listing) {
  const buttons = [];

  if (listing.canPause) {
    buttons.push(
      buildLifecycleActionButton({
        action: 'pause',
        label: 'Mettre en pause',
        listing,
      }),
    );
  }

  if (listing.canResume) {
    buttons.push(
      buildLifecycleActionButton({
        action: 'resume',
        label: 'Remettre en ligne',
        listing,
      }),
    );
  }

  if (listing.canMarkSold) {
    buttons.push(
      buildLifecycleActionButton({
        action: 'mark_sold',
        label: 'Marquer comme vendue',
        listing,
      }),
    );
  }

  if (listing.canRelist) {
    buttons.push(
      buildLifecycleActionButton({
        action: 'relist',
        label: 'Remettre en vente',
        listing,
      }),
    );
  }

  if (listing.canRestore) {
    buttons.push(
      buildLifecycleActionButton({
        action: 'restore',
        label: 'Restaurer',
        listing,
      }),
    );
  }

  if (listing.canDelete) {
    buttons.push(
      buildLifecycleActionButton({
        action: 'delete',
        label: 'Supprimer l’annonce',
        listing,
      }),
    );
  }

  return buttons.join('');
}

function formatRestoreUntil(value) {
  if (!value) {
    return '';
  }

  const restoreDate = new Date(value);

  if (Number.isNaN(restoreDate.getTime())) {
    return String(value);
  }

  return restoreDate.toLocaleDateString('fr-FR');
}

function formatMemberSince(value) {
  if (!value) {
    return 'À confirmer';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('fr-FR');
}

function renderListingCard(listing) {
  const imageUrl = sanitizeListingImageUrl(listing.primaryImageUrl, listing);
  const lifecycleButtons = renderLifecycleButtons(listing);
  const canBoost = (listing.lifecycleStatus || 'active') === 'active' && listing.moderationStatus === 'approved';

  return `
    <article class="app-profile__listing-card" data-listing-id="${escapeAttribute(listing.id)}">
      ${
        imageUrl
          ? `<img class="app-profile__listing-image" src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(listing.title)}" loading="lazy" />`
          : '<div class="app-profile__listing-image app-profile__listing-image--placeholder" aria-hidden="true"></div>'
      }
      <div class="app-profile__listing-copy">
        <strong>${escapeHtml(listing.title)}</strong>
        <span>${escapeHtml(listing.lifecycleStatusLabel || 'Active')} · ${escapeHtml(formatListingStatus(listing.moderationStatus))}</span>
        <em>${escapeHtml(formatListingPrice(listing))}</em>
        ${
          listing.soldChannel
            ? `<small class="app-profile__listing-meta">${escapeHtml(listing.soldChannel)}</small>`
            : ''
        }
        ${
          listing.deletedReason
            ? `<small class="app-profile__listing-meta">${escapeHtml(listing.deletedReason)}</small>`
            : ''
        }
        ${
          listing.restoreUntil
            ? `<small class="app-profile__listing-meta">Restaurable jusqu’au ${escapeHtml(formatRestoreUntil(listing.restoreUntil))}</small>`
            : ''
        }
      </div>
      <div class="app-profile__listing-actions">
        <button
          class="app-flow__button"
          type="button"
          data-action="edit-listing"
          data-listing-slug="${escapeAttribute(listing.slug)}"
        >
          Modifier
        </button>
        <a class="app-flow__button app-flow__button--secondary" href="#listing/${escapeAttribute(listing.slug)}">Voir</a>
        ${
          canBoost
            ? `
              <button
                class="app-flow__button"
                type="button"
                data-action="activate-boost"
                data-listing-id="${escapeAttribute(listing.id)}"
              >
                Booster
              </button>
            `
            : ''
        }
        ${lifecycleButtons}
      </div>
    </article>
  `;
}

function renderLifecycleSection({
  emptyLabel,
  listings,
  title,
} = {}) {
  return `
    <section class="app-home__section app-profile__lifecycle-section">
      <div class="app-home__section-head">
        <h3>${escapeHtml(title)}</h3>
        <span>${escapeHtml(String(listings.length))}</span>
      </div>
      ${
        listings.length
          ? `<div class="app-profile__listing-grid">${listings.map(renderListingCard).join('')}</div>`
          : `
            <article class="app-empty-state">
              <strong>${escapeHtml(emptyLabel)}</strong>
            </article>
          `
      }
    </section>
  `;
}

export function renderProfileCityFeedback({
  citySuggestions = [],
  profileMissingCityLabel = '',
} = {}) {
  return `
    ${
      citySuggestions.length
        ? `
          <div
            class="app-profile__city-suggestions"
            id="profile-city-suggestions"
            role="listbox"
            aria-label="Suggestions de villes"
          >
            ${citySuggestions.map((city) => `
              <button
                class="app-profile__city-suggestion"
                type="button"
                role="option"
                data-action="select-profile-city"
                data-city-label="${escapeAttribute(city)}"
              >
                ${escapeHtml(city)}
              </button>
            `).join('')}
          </div>
        `
        : '<div id="profile-city-suggestions" hidden></div>'
    }

    ${
      profileMissingCityLabel
        ? `
          <button
            class="app-profile__city-create"
            type="button"
            data-action="suggest-profile-city"
            data-city-label="${escapeAttribute(profileMissingCityLabel)}"
          >
            Ville absente ? Utiliser "${escapeHtml(profileMissingCityLabel)}"
          </button>
        `
        : ''
    }
  `;
}

export function renderProfileScreen({
  citySuggestions = [],
  draftExists = false,
  lifecycleMessage = '',
  listings = [],
  listingsError = '',
  profile = null,
  profileAreaInput = null,
  profileError = '',
  profileMissingCityLabel = '',
  profileMessage = '',
  profileState = 'idle',
  profileSaveBusy = false,
  selectedProfileArea = '',
  session = null,
  state = 'loading',
  supportWhatsAppLink = null,
} = {}) {
  if (state === 'locked' || !session) {
    return `
      <section class="app-flow app-screen">
        <header class="app-flow__header">
          <div class="app-flow__meta">
            ${renderInAppBrand({ compact: true })}
          </div>
          <div>
            <p class="app-flow__eyebrow">Profil</p>
            <h2 class="app-flow__title">Connectez votre session vendeur</h2>
          </div>
        </header>

        <div class="app-auth__card">
          <strong>Profil verrouillé</strong>
          <p>La vérification active vos annonces, votre messagerie et votre portefeuille test.</p>
        </div>

        <div class="app-flow__actions">
          <a
            class="app-flow__button"
            href="#auth-welcome"
            data-action="begin-auth"
            data-intent="profile"
            data-return-route="#profile"
          >
            Commencer la vérification
          </a>
        </div>
      </section>
    `;
  }

  const counts = buildCounts(listings);
  const lifecycleGroups = groupListingsByLifecycle(listings);
  const hasListings = listings.length > 0;
  const profileArea = String(profile?.area ?? '').trim();
  const profileAreaSearchValue = String(profileAreaInput ?? profileArea).trim();
  const searchMatchesProfile =
    profileArea &&
    normalizeLocationValueForMatch(profileAreaSearchValue) === normalizeLocationValueForMatch(profileArea);
  const currentSelectedArea = String(
    selectedProfileArea || (searchMatchesProfile ? profileArea : ''),
  ).trim();
  const profilePhoneNumber = profile?.phoneNumber || session.phoneNumber;
  const displayName = String(profile?.displayName || '').trim();
  const identityName = displayName || 'Vendeur Zwibba';
  const memberSince = formatMemberSince(profile?.memberSince);
  const sellerReviewsHref = profile?.id
    ? `#seller/${encodeURIComponent(String(profile.id))}`
    : '';
  const hasCityFeedback = citySuggestions.length > 0 || Boolean(profileMissingCityLabel);

  return `
    <section class="app-flow app-screen">
      <header class="app-flow__header">
        <div class="app-flow__meta">
          ${renderInAppBrand({ compact: true })}
        </div>
        <div>
          <p class="app-flow__eyebrow">Profil</p>
          <h2 class="app-flow__title">Mon profil</h2>
        </div>
      </header>

      <div class="app-publish__status is-verified">
        <strong>${escapeHtml(profilePhoneNumber)}</strong>
        <span>Session vérifiée</span>
      </div>

      <section class="app-home__section app-profile__identity-card">
        <div class="app-profile__identity-head">
          <div class="app-profile__monogram" aria-hidden="true">${escapeHtml(sellerMonogram(identityName))}</div>
          <div>
            <h3>${escapeHtml(identityName)}</h3>
            <span>Membre depuis ${escapeHtml(memberSince)}</span>
          </div>
        </div>

        <form class="app-profile__identity-form" data-form="profile-identity">
          <label class="app-review__field app-review__field--full">
            <span>Nom public</span>
            <input
              name="displayName"
              type="text"
              value="${escapeAttribute(displayName)}"
              placeholder="Ex. Boutique Katanga"
              autocomplete="name"
              autocapitalize="words"
            />
          </label>
          <div class="app-flow__actions">
            <button class="app-flow__button" type="submit">Enregistrer mon nom</button>
            ${
              sellerReviewsHref
                ? `<a class="app-flow__button app-flow__button--secondary" href="${escapeAttribute(sellerReviewsHref)}">Mes avis</a>`
                : ''
            }
            ${
              supportWhatsAppLink
                ? `<a class="app-flow__button app-flow__button--secondary" href="${escapeAttribute(supportWhatsAppLink)}" target="_blank" rel="noreferrer">Support WhatsApp</a>`
                : ''
            }
            <button class="app-flow__button app-flow__button--secondary" type="button" data-action="logout">
              Déconnexion
            </button>
          </div>
        </form>
      </section>

      <section class="app-home__section app-profile__zone-card">
        <div class="app-home__section-head">
          <h3>Ma zone</h3>
          <span>${escapeHtml(profileArea || 'À définir')}</span>
        </div>

        <form class="app-profile__zone-form" data-form="profile-zone">
          <label class="app-review__field app-review__field--full">
            <span>Ville</span>
            <input
              name="areaSearch"
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-controls="profile-city-suggestions"
              aria-expanded="${hasCityFeedback ? 'true' : 'false'}"
              value="${escapeAttribute(profileAreaSearchValue)}"
              placeholder="Ex. Likasi"
              autocomplete="off"
              autocapitalize="words"
              enterkeyhint="done"
              inputmode="search"
              spellcheck="false"
              ${profileSaveBusy ? 'disabled' : ''}
            />
            <input
              type="hidden"
              name="area"
              value="${escapeAttribute(currentSelectedArea)}"
              data-selected-area="${escapeAttribute(currentSelectedArea)}"
            />
          </label>

          <div class="app-profile__city-feedback" data-profile-city-feedback>
            ${renderProfileCityFeedback({
              citySuggestions,
              profileMissingCityLabel,
            })}
          </div>

          ${
            profileState === 'loading'
              ? '<p class="app-profile__zone-note">Chargement de votre zone...</p>'
              : profileArea
                ? `<p class="app-profile__zone-note">Les nouvelles annonces reprendront automatiquement ${escapeHtml(profileArea)}.</p>`
                : '<p class="app-profile__zone-note">Choisissez votre zone une fois. Les nouvelles annonces la reprendront automatiquement.</p>'
          }

          ${
            profileMessage
              ? `<div class="app-publish__status is-verified" data-profile-zone-message><strong>Zone enregistrée</strong><span>${escapeHtml(profileMessage)}</span></div>`
              : ''
          }

          ${
            profileError
              ? `<div class="app-review__error-summary" data-profile-zone-error><strong>Impossible de mettre à jour le profil</strong><ul class="app-review__errors"><li>${escapeHtml(profileError)}</li></ul></div>`
              : ''
          }

          <div class="app-flow__actions">
            <button class="app-flow__button" type="submit"${profileSaveBusy ? ' disabled' : ''}>${escapeHtml(
              profileSaveBusy ? 'Enregistrement...' : 'Enregistrer ma zone',
            )}</button>
            ${
              draftExists
                ? '<a class="app-flow__button app-flow__button--secondary" href="#review">Revenir au brouillon</a>'
                : ''
            }
          </div>
        </form>
      </section>

      ${
        listingsError
          ? `<div class="app-review__error-summary"><strong>Impossible de charger vos annonces</strong><ul class="app-review__errors"><li>${escapeHtml(listingsError)}</li></ul></div>`
          : ''
      }

      ${
        lifecycleMessage
          ? `
            <div class="app-auth__card app-profile__lifecycle-message">
              <strong>Mise à jour de l’annonce</strong>
              <p>${escapeHtml(lifecycleMessage)}</p>
            </div>
          `
          : ''
      }

      <div class="app-profile__stats">
        <article><strong>Publiées</strong><span>${escapeHtml(String(counts.approved))}</span></article>
        <article><strong>En revue</strong><span>${escapeHtml(String(counts.pending))}</span></article>
        <article><strong>À corriger</strong><span>${escapeHtml(String(counts.blocked))}</span></article>
      </div>

      ${
        hasListings
          ? `
            ${renderLifecycleSection({
              emptyLabel: 'Aucune annonce active pour le moment.',
              listings: lifecycleGroups.active,
              title: 'Actives',
            })}
            ${renderLifecycleSection({
              emptyLabel: 'Aucune annonce en pause.',
              listings: lifecycleGroups.paused,
              title: 'En pause',
            })}
            ${renderLifecycleSection({
              emptyLabel: 'Aucune annonce vendue.',
              listings: lifecycleGroups.sold,
              title: 'Vendues',
            })}
            ${renderLifecycleSection({
              emptyLabel: 'Aucune annonce archivée.',
              listings: lifecycleGroups.archived,
              title: 'Archivées',
            })}
          `
          : `
            <section class="app-home__section">
              <div class="app-home__section-head">
                <h3>Mes annonces</h3>
                <span>Gestion vendeur</span>
              </div>
              <div class="app-profile__listing-grid">
                <article class="app-empty-state">
                  <strong>Aucune annonce pour le moment</strong>
                  <span>Commencez votre première annonce vendeur pour remplir votre profil.</span>
                  <a class="app-flow__button app-flow__button--secondary" href="#sell">Créer ma première annonce</a>
                </article>
              </div>
            </section>
          `
      }
    </section>
  `;
}
