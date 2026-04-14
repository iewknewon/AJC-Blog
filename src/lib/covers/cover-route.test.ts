import test from 'node:test';
import assert from 'node:assert/strict';

import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from '../auth/session';
import { POST } from '../../pages/api/admin/cover/suggest';

function createCookieStore(value: string) {
  return {
    get(name: string) {
      if (name !== ADMIN_SESSION_COOKIE) {
        return undefined;
      }

      return { value };
    },
  };
}

test('POST 会返回自动匹配到的封面建议', async () => {
  const token = await createAdminSessionToken('super-secret');
  const originalFetch = globalThis.fetch;
  const fetchCalls: string[] = [];

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    fetchCalls.push(url);

    if (url === 'https://api.example.com/v1/chat/completions') {
      const bodyText = String(init?.body ?? '');

      if (bodyText.includes('筛选目标') || bodyText.includes('候选列表')) {
        return new Response(JSON.stringify({
          choices: [
            {
              message: {
                content: '{"selected":[{"id":"c1","reason":"机房服务器画面更贴近部署主题，适合作为封面。"},{"id":"c2","reason":"控制台工作区可作为备选。"}]}',
              },
            },
          ],
        }), {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        });
      }

      return new Response(JSON.stringify({
        choices: [
          {
            message: {
              content: '{"queries":["server rack deployment","cloud dashboard workspace"]}',
            },
          },
        ],
      }), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    }

    if (url.startsWith('https://api.openverse.org/v1/images/')) {
      const query = new URL(url).searchParams.get('q');

      if (query !== 'server rack deployment') {
        return new Response(JSON.stringify({ results: [] }), {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        });
      }

      return new Response(JSON.stringify({
        results: [
          {
            title: 'Astro deployment cover',
            thumbnail: 'https://example.com/thumb/astro.jpg',
            url: 'https://example.com/full/astro.jpg',
            width: 1600,
            height: 900,
            license: 'cc0',
            foreign_landing_url: 'https://example.com/astro',
          },
          {
            title: 'Cloud dashboard workspace',
            thumbnail: 'https://example.com/thumb/dashboard.jpg',
            url: 'https://example.com/full/dashboard.jpg',
            width: 1600,
            height: 900,
            license: 'cc0',
            foreign_landing_url: 'https://example.com/dashboard',
          },
          {
            title: 'Server rack monitoring',
            thumbnail: 'https://example.com/thumb/server.jpg',
            url: 'https://example.com/full/server.jpg',
            width: 1600,
            height: 900,
            license: 'cc0',
            foreign_landing_url: 'https://example.com/server',
          },
        ],
      }), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    }

    if (url.startsWith('https://commons.wikimedia.org/w/api.php')) {
      return new Response(JSON.stringify({
        query: {
          pages: {},
        },
      }), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    }

    return new Response('not found', { status: 404 });
  };

  try {
    const response = await POST({
      request: new Request('https://gisgis.eu.cc/api/admin/cover/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Astro Cloudflare 部署',
          description: '博客部署总结',
          tags: 'Astro, Cloudflare',
          content: '# Astro Cloudflare',
          aiBaseUrl: 'https://api.example.com/v1',
          aiApiKey: 'test-key',
          aiModel: 'test-model',
        }),
      }),
      cookies: createCookieStore(token),
      locals: {
        runtime: {
          env: {
            SESSION_SECRET: 'super-secret',
          },
        },
      },
    });

    assert.equal(response.status, 200);

    const payload = await response.json() as {
      message?: string;
      suggestions?: Array<{
        coverUrl?: string;
      }>;
      suggestion?: {
        coverUrl?: string;
        query?: string;
        queryMode?: string;
        selectionReason?: string;
      };
    };

    assert.equal(fetchCalls[0], 'https://api.example.com/v1/chat/completions');
    assert.equal(payload.suggestion?.coverUrl, 'https://example.com/thumb/server.jpg');
    assert.equal(payload.suggestion?.query, 'server rack deployment');
    assert.equal(payload.suggestion?.queryMode, 'ai');
    assert.match(String(payload.suggestion?.selectionReason ?? ''), /部署主题/);
    assert.equal(payload.suggestions?.length, 3);
    assert.match(payload.message ?? '', /整篇内容/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
