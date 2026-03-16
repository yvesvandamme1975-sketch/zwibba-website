import { renderModerationPage } from './moderation/moderation-page';

const html = renderModerationPage({
  items: [
    {
      id: 'listing-1',
      listingTitle: 'Samsung Galaxy A54 128 Go',
      reasonSummary: 'Photo principale à confirmer',
      sellerPhoneNumber: '+243990000001',
      status: 'pending_manual_review',
    },
  ],
});

console.log(html);
