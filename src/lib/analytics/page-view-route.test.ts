import test from 'node:test';
import assert from 'node:assert/strict';

import { POST } from '../../pages/api/analytics/view';

function createDbMock() {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  let execCalls = 0;

  const db = {
    async exec(sql: string) {
      execCalls += 1;
      assert.match(sql, /CREATE TABLE IF NOT EXISTS page_views/);
      return { count: 1 };
    },
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          calls.push({ sql, values });
          return {
            async run() {
              return { success: true };
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  return { db, calls, getExecCalls: () => execCalls };
}

test('POST /api/analytics/view 会记录公开页面访问', async () => {
  const { db, calls, getExecCalls } = createDbMock();
  const request = new Request('https://example.com/api/analytics/view', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.8',
    },
    body: JSON.stringify({ path: '/blog/hello-world/' }),
  });

  (request as Request & { cf?: Record<string, unknown> }).cf = {
    country: 'US',
    region: 'California',
    city: 'San Francisco',
  };

  const response = await POST({
    request,
    locals: {
      runtime: {
        env: {
          DB: db,
        },
      },
    },
  });

  assert.equal(response.status, 204);
  assert.equal(getExecCalls(), 1);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /INSERT INTO page_views/);
  assert.equal(calls[0].values[1], '/blog/hello-world');
  assert.equal(calls[0].values[2], 'hello-world');
  assert.equal(calls[0].values[4], 'US');
});

test('POST /api/analytics/view 会忽略不应统计的路径', async () => {
  const { db, calls, getExecCalls } = createDbMock();
  const response = await POST({
    request: new Request('https://example.com/api/analytics/view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: '/admin/posts' }),
    }),
    locals: {
      runtime: {
        env: {
          DB: db,
        },
      },
    },
  });

  assert.equal(response.status, 204);
  assert.equal(getExecCalls(), 0);
  assert.equal(calls.length, 0);
});
