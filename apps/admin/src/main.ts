import { renderModerationPage } from './moderation/moderation-page';

const defaultApiBaseUrl = process.env.ZWIBBA_API_BASE_URL ?? 'http://127.0.0.1:3200';

export async function loadModerationQueue(apiBaseUrl = defaultApiBaseUrl) {
  const response = await fetch(`${apiBaseUrl}/moderation/queue`);

  if (!response.ok) {
    throw new Error(`Unable to load moderation queue (${response.status}).`);
  }

  return (await response.json()) as Parameters<typeof renderModerationPage>[0];
}

export async function renderModerationShell(
  queueLoader: () => Promise<Parameters<typeof renderModerationPage>[0]> = () =>
      loadModerationQueue(),
) {
  const queue = await queueLoader();
  return renderModerationPage(queue);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const html = await renderModerationShell();
  console.log(html);
}
