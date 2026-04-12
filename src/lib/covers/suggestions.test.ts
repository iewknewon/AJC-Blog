import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCoverSearchQueries, suggestCoverFromContent } from './suggestions';

test('buildCoverSearchQueries 会优先组合标签和正文里的英文关键词', () => {
  const queries = buildCoverSearchQueries({
    title: 'Astro 博客部署复盘',
    description: '记录我把博客部署到 Cloudflare Pages 的过程。',
    tags: 'Astro, Cloudflare, Deployment',
    content: '# Astro\n\n这篇文章记录了 Cloudflare Pages、D1 和部署踩坑。',
  });

  assert.deepEqual(queries.slice(0, 3), [
    'astro cloudflare deployment pages',
    'Astro Cloudflare Deployment',
    'Astro 博客部署复盘 Astro Cloudflare',
  ]);
});

test('suggestCoverFromContent 会从搜索结果中挑出最适合作为封面的图片', async () => {
  const fetchCalls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    fetchCalls.push(url);

    if (url.startsWith('https://api.openverse.org/v1/images/')) {
      return new Response(JSON.stringify({
        results: [
          {
            title: 'Tiny icon',
            url: 'https://example.com/full/icon.png',
            thumbnail: 'https://example.com/thumb/icon.png',
            width: 256,
            height: 256,
            license: 'by',
            foreign_landing_url: 'https://example.com/icon',
          },
          {
            title: 'Cloudflare dashboard workspace',
            url: 'https://example.com/full/dashboard.jpg',
            thumbnail: 'https://example.com/thumb/dashboard.jpg',
            width: 1920,
            height: 1080,
            license: 'cc0',
            foreign_landing_url: 'https://example.com/dashboard',
            creator: 'Jane Doe',
          },
        ],
      }), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    }

    return new Response('not found', { status: 404 });
  };

  const suggestion = await suggestCoverFromContent({
    title: 'Cloudflare 部署指南',
    tags: 'Cloudflare, Dashboard, DevOps',
    description: '讲解如何部署到 Cloudflare Pages',
  }, {
    fetchImpl,
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(suggestion?.coverUrl, 'https://example.com/thumb/dashboard.jpg');
  assert.equal(suggestion?.query, 'cloudflare dashboard devops pages');
  assert.equal(suggestion?.creator, 'Jane Doe');
  assert.equal(suggestion?.license, 'CC0');
  assert.equal(suggestion?.sourceUrl, 'https://example.com/dashboard');
});
