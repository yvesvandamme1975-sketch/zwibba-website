export function syncUnreadMessagesBadge(root, unreadMessagesCount = 0) {
  if (!root) {
    return;
  }

  const messagesTab = root.querySelector('[data-tab-id="messages"]');

  if (!messagesTab) {
    return;
  }

  const normalizedUnreadCount = Number.isFinite(unreadMessagesCount)
    ? Math.max(0, unreadMessagesCount)
    : 0;
  const existingBadge = messagesTab.querySelector('.app-tab-shell__nav-badge');

  if (normalizedUnreadCount <= 0) {
    existingBadge?.remove();
    return;
  }

  const unreadLabel = normalizedUnreadCount > 99 ? '99+' : String(normalizedUnreadCount);
  const badge = existingBadge ?? root.ownerDocument.createElement('span');

  badge.className = 'app-tab-shell__nav-badge';
  badge.textContent = unreadLabel;
  badge.setAttribute('aria-label', `${unreadLabel} message(s) non lus`);

  if (!existingBadge) {
    messagesTab.append(badge);
  }
}
