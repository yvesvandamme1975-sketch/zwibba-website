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

function redirect(response: ServerResponse, location: string) {
  response.writeHead(303, {
    location,
  });
  response.end();
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

async function readRequestBody(request: IncomingMessage) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
}

async function sendModerationAction({
  action,
  apiBaseUrl,
  listingId,
  reasonSummary,
  sharedSecret,
}: {
  action: 'approve' | 'block';
  apiBaseUrl: string;
  listingId: string;
  reasonSummary?: string;
  sharedSecret: string;
}) {
  const response = await fetch(`${apiBaseUrl}/moderation/${listingId}/${action}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-zwibba-admin-secret': sharedSecret,
    },
    body: JSON.stringify({
      reasonSummary: reasonSummary ?? '',
    }),
  });

  if (!response.ok) {
    throw new Error(`Unable to apply moderation action (${response.status}).`);
  }
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
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');

    if (request.url === '/healthz') {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (!isAuthorized(request, sharedSecret)) {
      sendJson(response, 401, { error: 'Unauthorized' });
      return;
    }

    const actionMatch = requestUrl.pathname.match(/^\/moderation\/([^/]+)\/(approve|block)$/);

    if (request.method === 'POST' && actionMatch) {
      try {
        const [, listingId, action] = actionMatch;
        const rawBody = await readRequestBody(request);
        const form = new URLSearchParams(rawBody);

        await sendModerationAction({
          action: action as 'approve' | 'block',
          apiBaseUrl: apiBaseUrl ?? 'http://127.0.0.1:3200',
          listingId,
          reasonSummary: form.get('reasonSummary') ?? '',
          sharedSecret,
        });
        redirect(response, '/moderation');
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : 'Unknown moderation error.';
        sendJson(response, 500, { error: message });
      }
      return;
    }

    if (requestUrl.pathname !== '/' && requestUrl.pathname !== '/moderation') {
      sendJson(response, 404, { error: 'Not found' });
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
