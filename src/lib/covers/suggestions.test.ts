import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCoverSearchQueries, suggestCoverCandidatesFromContent, suggestCoverFromContent, suggestImageForQuery } from './suggestions';

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

  assert.ok(fetchCalls.length >= 2);
  assert.equal(suggestion?.coverUrl, 'https://example.com/thumb/dashboard.jpg');
  assert.ok([
    'cloudflare dashboard devops pages',
    'Cloudflare 部署指南 Cloudflare Dashboard',
  ].includes(String(suggestion?.query)));
  assert.equal(suggestion?.queryMode, 'heuristic');
  assert.equal(suggestion?.creator, 'Jane Doe');
  assert.equal(suggestion?.license, 'CC0');
  assert.equal(suggestion?.sourceUrl, 'https://example.com/dashboard');
  assert.equal(suggestion?.providerLabel, 'Openverse');
});

test('suggestCoverFromContent 会优先使用 AI 生成的检索词', async () => {
  const fetchCalls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    fetchCalls.push(url);
    const query = new URL(url).searchParams.get('q');

    if (query === 'server rack deployment') {
      return new Response(JSON.stringify({
        results: [
          {
            title: 'Server rack deployment',
            url: 'https://example.com/full/server.jpg',
            thumbnail: 'https://example.com/thumb/server.jpg',
            width: 1920,
            height: 1080,
            license: 'cc0',
          },
        ],
      }), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    }

    return new Response(JSON.stringify({ results: [] }), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  };

  const suggestion = await suggestCoverFromContent({
    title: '部署复盘',
    description: '只有中文内容',
    tags: '部署, 云服务',
    content: '全文都是中文。',
  }, {
    fetchImpl,
    preferredQueries: ['server rack deployment'],
  });

  assert.ok(fetchCalls.length >= 2);
  assert.equal(suggestion?.query, 'server rack deployment');
  assert.equal(suggestion?.queryMode, 'ai');
});

test('suggestCoverFromContent 会在 Openverse 没有结果时使用 Wikimedia Commons 候选', async () => {
  const suggestion = await suggestCoverFromContent({
    title: 'Server deployment guide',
    description: 'A guide about production deployment',
    tags: 'server, deployment',
  }, {
    fetchImpl: async (input) => {
      const url = String(input);

      if (url.startsWith('https://api.openverse.org/v1/images/')) {
        return new Response(JSON.stringify({ results: [] }), {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        });
      }

      if (url.startsWith('https://commons.wikimedia.org/w/api.php')) {
        return new Response(JSON.stringify({
          query: {
            pages: {
              1: {
                title: 'File:Server rack deployment photo.jpg',
                canonicalurl: 'https://commons.wikimedia.org/wiki/File:Server_rack_deployment_photo.jpg',
                imageinfo: [
                  {
                    url: 'https://upload.wikimedia.org/server-rack.jpg',
                    thumburl: 'https://upload.wikimedia.org/server-rack-thumb.jpg',
                    width: 2200,
                    height: 1200,
                    extmetadata: {
                      Artist: { value: 'Wikimedia User' },
                      LicenseShortName: { value: 'CC BY-SA 4.0' },
                      ImageDescription: { value: 'Server rack deployment in datacenter' },
                    },
                  },
                ],
              },
            },
          },
        }), {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        });
      }

      return new Response('not found', { status: 404 });
    },
  });

  assert.equal(suggestion?.provider, 'wikimedia');
  assert.equal(suggestion?.providerLabel, 'Wikimedia Commons');
  assert.equal(suggestion?.coverUrl, 'https://upload.wikimedia.org/server-rack.jpg');
});

test('suggestCoverCandidatesFromContent 会返回最多 3 张候选封面', async () => {
  const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({
    results: [
      {
        title: 'Cloudflare dashboard workspace',
        thumbnail: 'https://example.com/thumb/one.jpg',
        url: 'https://example.com/full/one.jpg',
        width: 1920,
        height: 1080,
        license: 'cc0',
      },
      {
        title: 'Developer laptop setup',
        thumbnail: 'https://example.com/thumb/two.jpg',
        url: 'https://example.com/full/two.jpg',
        width: 1920,
        height: 1080,
        license: 'cc0',
      },
      {
        title: 'Server rack deployment',
        thumbnail: 'https://example.com/thumb/three.jpg',
        url: 'https://example.com/full/three.jpg',
        width: 1920,
        height: 1080,
        license: 'cc0',
      },
      {
        title: 'Extra image',
        thumbnail: 'https://example.com/thumb/four.jpg',
        url: 'https://example.com/full/four.jpg',
        width: 1920,
        height: 1080,
        license: 'cc0',
      },
    ],
  }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });

  const suggestions = await suggestCoverCandidatesFromContent({
    title: 'Cloudflare 部署指南',
    tags: 'Cloudflare, Dashboard, DevOps',
    description: '讲解如何部署到 Cloudflare Pages',
  }, {
    fetchImpl,
    limit: 3,
  });

  assert.equal(suggestions.length, 3);
  assert.equal(suggestions[0]?.coverUrl, 'https://example.com/thumb/one.jpg');
});

test('suggestImageForQuery 会为正文插图挑出最合适的图片', async () => {
  const suggestion = await suggestImageForQuery('deployment workflow diagram', {
    fetchImpl: async () => new Response(JSON.stringify({
      results: [
        {
          title: 'Tiny icon',
          thumbnail: 'https://example.com/thumb/icon.png',
          url: 'https://example.com/full/icon.png',
          width: 300,
          height: 300,
          license: 'by',
        },
        {
          title: 'Deployment workflow diagram',
          thumbnail: 'https://example.com/thumb/diagram.jpg',
          url: 'https://example.com/full/diagram.jpg',
          width: 1600,
          height: 900,
          license: 'cc0',
          creator: 'Openverse User',
          foreign_landing_url: 'https://example.com/diagram',
        },
      ],
    }), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    }),
    queryMode: 'ai',
  });

  assert.equal(suggestion?.coverUrl, 'https://example.com/thumb/diagram.jpg');
  assert.equal(suggestion?.query, 'deployment workflow diagram');
  assert.equal(suggestion?.queryMode, 'ai');
  assert.equal(suggestion?.creator, 'Openverse User');
  assert.equal(suggestion?.providerLabel, 'Openverse');
});
