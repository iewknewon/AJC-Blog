import test from 'node:test';
import assert from 'node:assert/strict';

import { POST } from '../../pages/api/learn/chat';

function createDbMock() {
  const calls: Array<{ sql: string; values: unknown[] }> = [];

  const db = {
    async batch() {
      return [];
    },
    prepare(sql: string) {
      return {
        async run() {
          calls.push({ sql, values: [] });
          return { success: true };
        },
        bind(...values: unknown[]) {
          calls.push({ sql, values });

          return {
            async first() {
              if (sql.includes('SUM(CASE WHEN created_at')) {
                return {
                  hourly_count: 1,
                  daily_count: 2,
                };
              }

              return null;
            },
            async all() {
              return { results: [] };
            },
            async run() {
              return { success: true };
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  return { db, calls };
}

test('POST /api/learn/chat returns 503 when learning AI is not configured', async () => {
  const response = await POST({
    request: new Request('https://example.com/api/learn/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: 'networking',
        lessonSlug: 'protocol-stack',
        messages: [{ role: 'user', content: 'Explain the protocol stack.' }],
      }),
    }),
    locals: {
      runtime: {
        env: {},
      },
    },
  });

  assert.equal(response.status, 503);
});

test('POST /api/learn/chat returns a lesson-bound reply', async () => {
  const originalFetch = globalThis.fetch;
  const { db } = createDbMock();

  globalThis.fetch = async () => new Response(JSON.stringify({
    choices: [
      {
        message: {
          content: 'The protocol stack splits network work into layers so each layer focuses on one job.',
        },
      },
    ],
  }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });

  try {
    const response = await POST({
      request: new Request('https://example.com/api/learn/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '1.1.1.1',
        },
        body: JSON.stringify({
          subject: 'networking',
          lessonSlug: 'protocol-stack',
          messages: [{ role: 'user', content: 'Explain the protocol stack simply.' }],
        }),
      }),
      locals: {
        runtime: {
          env: {
            DB: db,
            LEARNING_AI_BASE_URL: 'https://api.example.com/v1',
            LEARNING_AI_API_KEY: 'test-key',
            LEARNING_AI_MODEL: 'test-model',
          },
        },
      },
    });

    assert.equal(response.status, 200);

    const payload = await response.json() as {
      reply?: string;
      message?: string;
    };

    assert.match(payload.reply ?? '', /layers|network/i);
    assert.match(payload.message ?? '', /protocol-stack|协议|lesson/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
