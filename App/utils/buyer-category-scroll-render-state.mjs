const CATEGORY_ROW_SELECTOR = '.app-home__chip-row';

export function captureBuyerCategoryScrollRenderState(root) {
  const row = root?.querySelector?.(CATEGORY_ROW_SELECTOR) ?? null;

  return {
    scrollLeft: typeof row?.scrollLeft === 'number' ? row.scrollLeft : null,
  };
}

export function restoreBuyerCategoryScrollRenderState(root, capturedState) {
  if (!root || !capturedState) {
    return;
  }

  const row = root.querySelector?.(CATEGORY_ROW_SELECTOR) ?? null;

  if (row && typeof capturedState.scrollLeft === 'number') {
    row.scrollLeft = capturedState.scrollLeft;
  }
}
