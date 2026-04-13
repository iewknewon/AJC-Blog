import test from 'node:test';
import assert from 'node:assert/strict';

import { createAdminSessionToken, ADMIN_SESSION_COOKIE } from '../auth/session';
import { POST } from '../../pages/api/admin/posts/[id]';

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

function createDbMock(postExists = true) {
  const deletedIds: string[] = [];

  const db = {
    async batch() {
      return [];
    },
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async first() {
              if (!sql.includes('SELECT * FROM posts WHERE id')) {
                return null;
              }

              if (!postExists) {
                return null;
              }

              return {
                id: String(values[0]),
                slug: 'hello-astro',
                title: 'Hello',
                description: 'Desc',
                content: 'Body',
                tags: '["Astro"]',
                cover: null,
                featured: 0,
                status: 'draft',
                published_at: null,
                created_at: '2026-04-01T00:00:00.000Z',
                updated_at: '2026-04-01T00:00:00.000Z',
              };
            },
            async run() {
              if (sql.includes('DELETE FROM posts WHERE id')) {
                deletedIds.push(String(values[0]));
              }

              return { success: true };
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  return { db, deletedIds };
}

async function createContext(postExists = true) {
  const token = await createAdminSessionToken('super-secret');
  const formData = new FormData();
  formData.set('intent', 'delete');
  const { db, deletedIds } = createDbMock(postExists);

  return {
    context: {
      params: { id: 'post-1' },
      request: new Request('https://gisgis.eu.cc/api/admin/posts/post-1', {
        method: 'POST',
        body: formData,
      }),
      cookies: createCookieStore(token),
      locals: {
        runtime: {
          env: {
            DB: db,
            SESSION_SECRET: 'super-secret',
          },
        },
      },
      redirect(location: string) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: location,
          },
        });
      },
    },
    deletedIds,
  };
}

test('POST 在 intent=delete 时删除文章并返回列表页', async () => {
  const { context, deletedIds } = await createContext(true);

  const response = await POST(context);

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('Location'), '/admin/posts');
  assert.deepEqual(deletedIds, ['post-1']);
});

test('POST 在文章不存在时不会执行删除', async () => {
  const { context, deletedIds } = await createContext(false);

  const response = await POST(context);

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('Location'), '/admin/posts');
  assert.deepEqual(deletedIds, []);
});
