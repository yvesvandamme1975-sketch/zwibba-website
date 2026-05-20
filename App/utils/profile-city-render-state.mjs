export function captureProfileCityRenderState(activeElement) {
  if (!activeElement || activeElement.name !== 'areaSearch') {
    return null;
  }

  return {
    name: 'areaSearch',
    selectionEnd:
      typeof activeElement.selectionEnd === 'number' ? activeElement.selectionEnd : null,
    selectionStart:
      typeof activeElement.selectionStart === 'number' ? activeElement.selectionStart : null,
    value: typeof activeElement.value === 'string' ? activeElement.value : '',
  };
}

export function restoreProfileCityRenderState(root, capturedState) {
  if (!root || !capturedState || capturedState.name !== 'areaSearch') {
    return;
  }

  const nextInput = root.querySelector('input[name="areaSearch"]');

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
