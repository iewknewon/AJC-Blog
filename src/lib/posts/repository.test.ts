import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deletePost,
  mapPostRow,
  normalizePostInput,
  serializeTags,
} from './repository';

test('normalizePostInput 会把已发布文章补齐 publishedAt 并规范 tags', () => {
  const normalized = normalizePostInput({
    slug: 'hello-astro',
    title: 'Hello',
    description: 'Desc',
    content: 'Body',
    tags: [' Astro ', 'Markdown', 'Astro', ''],
    featured: true,
    status: 'published',
  });

  assert.equal(normalized.slug, 'hello-astro');
  assert.deepEqual(normalized.tags, ['Astro', 'Markdown']);
  assert.equal(normalized.featured, 1);
  assert.equal(normalized.status, 'published');
  assert.match(normalized.publishedAt ?? '', /^\d{4}-\d{2}-\d{2}T/);
});

test('normalizePostInput 会把草稿文章的 publishedAt 清空', () => {
  const normalized = normalizePostInput({
    slug: 'draft-post',
    title: 'Draft',
    description: 'Desc',
    content: 'Body',
    tags: ['Draft'],
    featured: false,
    status: 'draft',
    publishedAt: '2026-04-10T00:00:00.000Z',
  });

  assert.equal(normalized.featured, 0);
  assert.equal(normalized.status, 'draft');
  assert.equal(normalized.publishedAt, null);
});

test('mapPostRow 会把数据库行转换成领域对象', () => {
  const post = mapPostRow({
    id: 'post-1',
    slug: 'hello-astro',
    title: 'Hello',
    description: 'Desc',
    content: 'Body',
    tags: '["Astro","Markdown"]',
    cover: null,
    featured: 1,
    status: 'published',
    published_at: '2026-04-01T00:00:00.000Z',
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-02T00:00:00.000Z',
  });

  assert.equal(post.featured, true);
  assert.deepEqual(post.tags, ['Astro', 'Markdown']);
  assert.equal(post.publishedAt?.toISOString(), '2026-04-01T00:00:00.000Z');
  assert.equal(post.updatedAt.toISOString(), '2026-04-02T00:00:00.000Z');
});

test('serializeTags 会输出 JSON 字符串', () => {
  assert.equal(serializeTags(['Astro', 'Markdown']), '["Astro","Markdown"]');
});

test('deletePost 会按文章 id 执行删除', async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const db = {
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

  await deletePost(db, 'post-1');

  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /DELETE FROM posts WHERE id = \?/);
  assert.deepEqual(calls[0].values, ['post-1']);
});
