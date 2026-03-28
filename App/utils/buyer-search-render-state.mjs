export function captureBuyerSearchRenderState(activeElement) {
  if (!activeElement || activeElement.name !== 'buyerSearch') {
    return null;
  }

  return {
    name: 'buyerSearch',
    selectionEnd:
      typeof activeElement.selectionEnd === 'number' ? activeElement.selectionEnd : null,
    selectionStart:
      typeof activeElement.selectionStart === 'number' ? activeElement.selectionStart : null,
    value: typeof activeElement.value === 'string' ? activeElement.value : '',
  };
}

export function restoreBuyerSearchRenderState(root, capturedState) {
  if (!root || !capturedState || capturedState.name !== 'buyerSearch') {
    return;
  }

  const nextInput = root.querySelector('input[name="buyerSearch"]');

  if (!nextInput) {
    return;
  }

  nextInput.focus();

  if (
    typeof nextInput.setSelectionRange === 'function' &&
    typeof capturedState.selectionStart === 'number' &&
    typeof capturedState.selectionEnd === 'number'
  ) {
    nextInput.setSelectionRange(capturedState.selectionStart, capturedState.selectionEnd);
  }
}
