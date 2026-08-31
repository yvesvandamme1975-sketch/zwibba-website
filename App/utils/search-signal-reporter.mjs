export function createSearchSignalReporter({
  reportFn,
  delayMs = 800,
  scheduleFn = setTimeout,
  cancelFn = clearTimeout,
}) {
  let pendingHandle = null;
  let pendingPayload = null;
  let lastReportedKey = null;

  function payloadKey(payload) {
    return JSON.stringify([
      payload.rawQuery,
      payload.selectedCategoryId,
      payload.resultCount,
    ]);
  }

  async function sendPending() {
    const payload = pendingPayload;
    pendingHandle = null;
    pendingPayload = null;

    if (!payload) {
      return;
    }

    lastReportedKey = payloadKey(payload);

    try {
      await reportFn(payload);
    } catch {}
  }

  function cancel() {
    if (pendingHandle !== null) {
      cancelFn(pendingHandle);
    }

    pendingHandle = null;
    pendingPayload = null;
  }

  function report(payload) {
    cancel();

    if (typeof payload?.rawQuery !== 'string' || !payload.rawQuery.trim()) {
      return;
    }

    if (payloadKey(payload) === lastReportedKey) {
      return;
    }

    pendingPayload = payload;
    pendingHandle = scheduleFn(sendPending, delayMs);
  }

  async function flush() {
    if (pendingHandle !== null) {
      cancelFn(pendingHandle);
      pendingHandle = null;
    }

    await sendPending();
  }

  return { report, flush, cancel };
}
