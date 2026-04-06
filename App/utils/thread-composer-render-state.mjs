export function captureThreadComposerRenderState(activeElement) {
  if (!activeElement || activeElement.name !== 'threadMessage') {
    return null;
  }

  return {
    name: 'threadMessage',
    selectionEnd:
      typeof activeElement.selectionEnd === 'number' ? activeElement.selectionEnd : null,
    selectionStart:
      typeof activeElement.selectionStart === 'number' ? activeElement.selectionStart : null,
    value: typeof activeElement.value === 'string' ? activeElement.value : '',
  };
}

export function restoreThreadComposerRenderState(root, capturedState) {
  if (!root || !capturedState || capturedState.name !== 'threadMessage') {
    return;
  }

  const nextInput = root.querySelector('input[name="threadMessage"]');

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
