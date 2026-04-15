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
    request: new Request('https://gisgis.eu.cc/api/learn/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: 'networking',
        lessonSlug: 'protocol-stack',
        messages: [{ role: 'user', content: '什么是协议栈？' }],
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
          content: '分层的好处是降低复杂度，让每一层都只关心自己的职责。',
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
      request: new Request('https://gisgis.eu.cc/api/learn/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '1.1.1.1',
        },
        body: JSON.stringify({
          subject: 'networking',
          lessonSlug: 'protocol-stack',
          messages: [{ role: 'user', content: '为什么网络要分层？' }],
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

    assert.match(payload.reply ?? '', /降低复杂度/);
    assert.match(payload.message ?? '', /分层模型与协议栈/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
