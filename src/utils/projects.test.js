import test from 'node:test';
import assert from 'node:assert/strict';
import { getRelatedPostsForProject } from './projects.js';

const posts = [
  {
    slug: 'cloudflare-deploy',
    data: { pubDate: new Date('2026-04-05') },
  },
  {
    slug: 'hello-astro',
    data: { pubDate: new Date('2026-04-01') },
  },
  {
    slug: 'cloudflare-pages-env',
    data: { pubDate: new Date('2026-04-08') },
  },
];

test('按项目配置筛选相关文章并按发布时间倒序返回', () => {
  const relatedPosts = getRelatedPostsForProject(posts, ['hello-astro', 'cloudflare-pages-env']);

  assert.deepEqual(
    relatedPosts.map((post) => post.slug),
    ['cloudflare-pages-env', 'hello-astro'],
  );
});

test('忽略不存在的文章 slug', () => {
  const relatedPosts = getRelatedPostsForProject(posts, ['missing-post', 'cloudflare-deploy']);

  assert.deepEqual(
    relatedPosts.map((post) => post.slug),
    ['cloudflare-deploy'],
  );
});

test('未配置相关文章时返回空数组', () => {
  assert.deepEqual(getRelatedPostsForProject(posts, []), []);
});
