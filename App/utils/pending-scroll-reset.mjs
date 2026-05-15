export function createPendingScrollResetController() {
  let pendingTarget = '';

  return {
    request(target) {
      pendingTarget = String(target || '');
    },
    consume(target) {
      if (!pendingTarget || pendingTarget !== target) {
        return null;
      }

      pendingTarget = '';

      return {
        contentScrollTop: 0,
        pageScrollY: 0,
      };
    },
  };
}
