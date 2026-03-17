import { renderModerationPage } from './moderation/moderation-page';
import { createModerationServer, startModerationServer } from './server';

export type ModerationQueuePayload = Parameters<typeof renderModerationPage>[0];
export type ModerationQueueLoader = () => Promise<ModerationQueuePayload>;

const defaultApiBaseUrl =
  process.env.ZWIBBA_API_BASE_URL ?? 'http://127.0.0.1:3200';

export async function loadModerationQueue(apiBaseUrl = defaultApiBaseUrl) {
  const response = await fetch(`${apiBaseUrl}/moderation/queue`);

  if (!response.ok) {
    throw new Error(`Unable to load moderation queue (${response.status}).`);
  }

  return (await response.json()) as ModerationQueuePayload;
}

export async function renderModerationShell(
  queueLoader: ModerationQueueLoader = () => loadModerationQueue(),
) {
  const queue = await queueLoader();
  return renderModerationPage(queue);
}

export { createModerationServer, startModerationServer };

if (import.meta.url === `file://${process.argv[1]}`) {
  startModerationServer();
}
