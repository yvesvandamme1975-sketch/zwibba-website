import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { loadAdminEnv } from './config/env';
import { renderModerationPage, type ModerationQueueItem } from './moderation/moderation-page';

function isAuthorized(request: IncomingMessage, sharedSecret: string) {
  return request.headers['x-zwibba-admin-secret'] === sharedSecret;
}

function sendHtml(response: ServerResponse, statusCode: number, html: string) {
  response.writeHead(statusCode, {
    'content-type': 'text/html; charset=utf-8',
  });
  response.end(html);
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: Record<string, unknown>,
) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
}

function renderDocument(body: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Zwibba Moderation</title>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

async function loadQueueFromApi(apiBaseUrl: string) {
  const response = await fetch(`${apiBaseUrl}/moderation/queue`);

  if (!response.ok) {
    throw new Error(`Unable to load moderation queue (${response.status}).`);
  }

  return (await response.json()) as {
    items: ModerationQueueItem[];
  };
}

export function createModerationServer({
  apiBaseUrl,
  queueLoader,
  sharedSecret,
}: {
  apiBaseUrl?: string;
  queueLoader?: () => Promise<{ items: ModerationQueueItem[] }>;
  sharedSecret: string;
}) {
  const resolvedQueueLoader = queueLoader ??
    (() => loadQueueFromApi(apiBaseUrl ?? 'http://127.0.0.1:3200'));

  return createServer(async (request, response) => {
    if (request.url === '/healthz') {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.url !== '/' && request.url !== '/moderation') {
      sendJson(response, 404, { error: 'Not found' });
      return;
    }

    if (!isAuthorized(request, sharedSecret)) {
      sendJson(response, 401, { error: 'Unauthorized' });
      return;
    }

    try {
      const queue = await resolvedQueueLoader();
      const html = renderModerationPage(queue);
      sendHtml(response, 200, renderDocument(html));
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Unknown moderation error.';
      sendJson(response, 500, { error: message });
    }
  });
}

export function startModerationServer() {
  const env = loadAdminEnv();
  const server = createModerationServer({
    apiBaseUrl: env.apiBaseUrl,
    sharedSecret: env.sharedSecret,
  });

  server.listen(env.port, '0.0.0.0', () => {
    console.log(`Zwibba admin listening on http://0.0.0.0:${env.port}`);
  });

  return server;
}
