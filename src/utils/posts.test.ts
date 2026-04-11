import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAdjacentPosts,
  getAllTagsFromPosts,
  getFeaturedPostsFromPosts,
  getLatestPostsFromPosts,
  getPostsByTagFromPosts,
  paginatePosts,
  searchPostsFromPosts,
} from './posts';

const posts = [
  {
    id: 'post-1',
    slug: 'cloudflare-pages-env',
    title: 'Cloudflare Pages 环境变量',
    description: '部署时如何配置环境变量',
    content: 'Cloudflare Pages 部署与环境变量配置。',
    tags: ['Cloudflare', '部署'],
    featured: true,
    status: 'published',
    publishedAt: new Date('2026-04-08T00:00:00.000Z'),
    createdAt: new Date('2026-04-08T00:00:00.000Z'),
    updatedAt: new Date('2026-04-08T00:00:00.000Z'),
  },
  {
    id: 'post-2',
    slug: 'astro-search',
    title: 'Astro 搜索实现',
    description: '给博客加一个搜索页',
    content: '使用 Astro 与 Markdown 做站内搜索。',
    tags: ['Astro', 'Markdown'],
    featured: false,
    status: 'published',
    publishedAt: new Date('2026-04-05T00:00:00.000Z'),
    createdAt: new Date('2026-04-05T00:00:00.000Z'),
    updatedAt: new Date('2026-04-05T00:00:00.000Z'),
  },
  {
    id: 'post-3',
    slug: 'd1-notes',
    title: 'D1 使用记录',
    description: '数据库接入笔记',
    content: 'Cloudflare D1 与 Astro 集成方式。',
    tags: ['Cloudflare', '数据库'],
    featured: true,
    status: 'published',
    publishedAt: new Date('2026-04-01T00:00:00.000Z'),
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    updatedAt: new Date('2026-04-01T00:00:00.000Z'),
  },
];

test('getFeaturedPostsFromPosts 返回推荐文章', () => {
  assert.deepEqual(
    getFeaturedPostsFromPosts(posts).map((post) => post.slug),
    ['cloudflare-pages-env', 'd1-notes'],
  );
});

test('getLatestPostsFromPosts 按需截取最新文章', () => {
  assert.deepEqual(
    getLatestPostsFromPosts(posts, 2).map((post) => post.slug),
    ['cloudflare-pages-env', 'astro-search'],
  );
});

test('getAllTagsFromPosts 聚合标签并统计数量', () => {
  assert.deepEqual(getAllTagsFromPosts(posts), [
    { name: '部署', count: 1 },
    { name: '数据库', count: 1 },
    { name: 'Astro', count: 1 },
    { name: 'Cloudflare', count: 2 },
    { name: 'Markdown', count: 1 },
  ]);
});

test('getPostsByTagFromPosts 按标签筛选文章', () => {
  assert.deepEqual(
    getPostsByTagFromPosts(posts, 'Cloudflare').map((post) => post.slug),
    ['cloudflare-pages-env', 'd1-notes'],
  );
});

test('searchPostsFromPosts 会搜索标题、摘要、标签和正文', () => {
  assert.deepEqual(
    searchPostsFromPosts(posts, 'markdown').map((post) => post.slug),
    ['astro-search'],
  );

  assert.deepEqual(
    searchPostsFromPosts(posts, '部署').map((post) => post.slug),
    ['cloudflare-pages-env'],
  );
});

test('paginatePosts 返回正确分页信息', () => {
  const pagination = paginatePosts(posts, 2, 2);

  assert.equal(pagination.currentPage, 2);
  assert.equal(pagination.totalPages, 2);
  assert.equal(pagination.totalItems, 3);
  assert.deepEqual(pagination.items.map((post) => post.slug), ['d1-notes']);
});

test('getAdjacentPosts 返回上一篇和下一篇', () => {
  assert.deepEqual(getAdjacentPosts(posts, 'astro-search').previous?.slug, 'd1-notes');
  assert.deepEqual(getAdjacentPosts(posts, 'astro-search').next?.slug, 'cloudflare-pages-env');
});
