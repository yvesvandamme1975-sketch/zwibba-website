import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import { escapeHtml, formatCdf } from '../../utils/rendering.mjs';

function renderWalletTransaction(transaction) {
  return `
    <article class="app-wallet__transaction app-wallet__transaction--${escapeHtml(transaction.kind)}">
      <div>
        <strong>${escapeHtml(transaction.label)}</strong>
        <span>${escapeHtml(transaction.createdAtLabel)}</span>
      </div>
      <em>${transaction.amountCdf > 0 ? '+' : '-'}${escapeHtml(formatCdf(Math.abs(transaction.amountCdf)).replace(' CDF', ''))} CDF</em>
    </article>
  `;
}

export function renderWalletScreen({
  state = 'loading',
  wallet = {
    balanceCdf: 0,
    transactions: [],
  },
} = {}) {
  if (state === 'locked') {
    return `
      <section class="app-flow app-screen">
        <header class="app-flow__header">
          <div class="app-flow__meta">
            ${renderInAppBrand({ compact: true })}
          </div>
          <div>
            <p class="app-flow__eyebrow">Portefeuille</p>
            <h2 class="app-flow__title">Vérifiez votre numéro</h2>
          </div>
        </header>

        <div class="app-auth__card">
          <strong>Activez votre portefeuille test</strong>
          <p>La vérification ouvre le solde bêta et les transactions de boost.</p>
        </div>

        <div class="app-flow__actions">
          <a
            class="app-flow__button"
            href="#auth-welcome"
            data-action="begin-auth"
            data-intent="wallet"
            data-return-route="#wallet"
          >
            Commencer la vérification
          </a>
        </div>
      </section>
    `;
  }

  return `
    <section class="app-flow app-screen">
      <header class="app-flow__header">
        <div class="app-flow__meta">
          ${renderInAppBrand({ compact: true })}
        </div>
        <div>
          <p class="app-flow__eyebrow">Portefeuille</p>
          <h2 class="app-flow__title">Mon portefeuille</h2>
        </div>
      </header>

      <div class="app-wallet__balance">
        <strong>Solde disponible</strong>
        <span>${escapeHtml(formatCdf(wallet.balanceCdf))}</span>
      </div>

      <section class="app-home__section">
        <div class="app-home__section-head">
          <h3>Transactions récentes</h3>
          <span>Historique beta</span>
        </div>
        <div class="app-wallet__transactions">
          ${wallet.transactions.map(renderWalletTransaction).join('')}
        </div>
      </section>
    </section>
  `;
}
