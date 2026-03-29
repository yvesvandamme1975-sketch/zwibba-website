function isReviewDraftForm(form) {
  return form?.dataset?.form === 'review-draft';
}

function isRestorableField(field) {
  return Boolean(
    field &&
      typeof field.name === 'string' &&
      field.name &&
      typeof field.value === 'string',
  );
}

export function captureReviewDraftRenderState(activeElement) {
  const form = activeElement?.form;

  if (!isReviewDraftForm(form)) {
    return null;
  }

  const values = Object.fromEntries(
    Array.from(form.elements ?? [])
      .filter(isRestorableField)
      .map((field) => [field.name, field.value]),
  );

  return {
    activeField: {
      name: activeElement.name,
      selectionEnd:
        typeof activeElement.selectionEnd === 'number' ? activeElement.selectionEnd : null,
      selectionStart:
        typeof activeElement.selectionStart === 'number' ? activeElement.selectionStart : null,
    },
    formName: 'review-draft',
    values,
  };
}

export function restoreReviewDraftRenderState(root, capturedState) {
  if (!root || !capturedState || capturedState.formName !== 'review-draft') {
    return;
  }

  const form = root.querySelector('form[data-form="review-draft"]');

  if (!form) {
    return;
  }

  for (const [fieldName, fieldValue] of Object.entries(capturedState.values ?? {})) {
    const field = form.querySelector(`[name="${fieldName}"]`);

    if (field && typeof field.value === 'string') {
      field.value = fieldValue;
    }
  }

  if (!capturedState.activeField?.name) {
    return;
  }

  const activeField = form.querySelector(`[name="${capturedState.activeField.name}"]`);

  if (!activeField || typeof activeField.focus !== 'function') {
    return;
  }

  activeField.focus();

  if (
    typeof activeField.setSelectionRange === 'function' &&
    typeof capturedState.activeField.selectionStart === 'number' &&
    typeof capturedState.activeField.selectionEnd === 'number'
  ) {
    activeField.setSelectionRange(
      capturedState.activeField.selectionStart,
      capturedState.activeField.selectionEnd,
    );
  }
}
