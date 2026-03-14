export function createChatThread({
  id,
  kind = 'listing',
  sellerId,
  buyerId,
  listingId = '',
  unreadCount = 0,
}) {
  return {
    id,
    kind,
    sellerId,
    buyerId,
    listingId,
    unreadCount,
  };
}
