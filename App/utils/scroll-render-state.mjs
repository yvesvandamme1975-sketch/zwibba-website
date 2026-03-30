const CONTENT_SELECTOR = '.app-tab-shell__content';

export function captureScrollRenderState(root, win = globalThis.window) {
  const content = root?.querySelector?.(CONTENT_SELECTOR) ?? null;

  return {
    contentScrollTop: typeof content?.scrollTop === 'number' ? content.scrollTop : null,
    pageScrollY: typeof win?.scrollY === 'number' ? win.scrollY : 0,
  };
}

export function restoreScrollRenderState(root, capturedState, win = globalThis.window) {
  if (!root || !capturedState) {
    return;
  }

  const content = root.querySelector?.(CONTENT_SELECTOR) ?? null;

  if (content && typeof capturedState.contentScrollTop === 'number') {
    content.scrollTop = capturedState.contentScrollTop;
  }

  if (typeof win?.scrollTo === 'function' && typeof capturedState.pageScrollY === 'number') {
    win.scrollTo(0, capturedState.pageScrollY);
  }
}
