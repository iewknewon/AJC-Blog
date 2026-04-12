import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractTrackedPostSlug,
  formatIpFingerprint,
  formatLocationLabel,
  getAnalyticsSummary,
  getPageViewInputFromRequest,
  hashIpAddress,
  normalizeTrackedPath,
  recordPageView,
} from './repository';

test('normalizeTrackedPath 会归一化公开路径并过滤后台路径', () => {
  assert.equal(
    normalizeTrackedPath('/blog/hello-world/?from=home', 'https://example.com/api/analytics/view'),
    '/blog/hello-world',
  );
  assert.equal(normalizeTrackedPath('/', 'https://example.com/api/analytics/view'), '/');
  assert.equal(normalizeTrackedPath('/admin/posts', 'https://example.com/api/analytics/view'), null);
  assert.equal(normalizeTrackedPath('/api/admin/login', 'https://example.com/api/analytics/view'), null);
  assert.equal(normalizeTrackedPath('https://another.example.com/blog/hello-world', 'https://example.com/api/analytics/view'), null);
  assert.equal(normalizeTrackedPath('javascript:alert(1)', 'https://example.com/api/analytics/view'), null);
});

test('extractTrackedPostSlug 只识别文章详情页路径', () => {
  assert.equal(extractTrackedPostSlug('/blog/hello-world'), 'hello-world');
  assert.equal(extractTrackedPostSlug('/blog/hello-world/wechat'), null);
  assert.equal(extractTrackedPostSlug('/archive'), null);
});

test('hashIpAddress 会生成稳定的 SHA-256 指纹', async () => {
  const first = await hashIpAddress('203.0.113.8');
  const second = await hashIpAddress('203.0.113.8');

  assert.equal(first, second);
  assert.match(first ?? '', /^[a-f0-9]{64}$/);
  assert.equal(await hashIpAddress(''), null);
});

test('getPageViewInputFromRequest 会读取 Cloudflare 地区信息并推导文章 slug', async () => {
  const request = new Request('https://example.com/api/analytics/view', {
    method: 'POST',
    headers: {
      'CF-Connecting-IP': '203.0.113.8',
      'User-Agent': 'UnitTestBrowser/1.0',
      Referer: 'https://example.com/archive',
    },
  });

  (request as Request & { cf?: Record<string, unknown> }).cf = {
    country: 'US',
    region: 'California',
    city: 'San Francisco',
    continent: 'NA',
    colo: 'SJC',
  };

  const input = await getPageViewInputFromRequest(request, '/blog/hello-world');

  assert.equal(input.path, '/blog/hello-world');
  assert.equal(input.postSlug, 'hello-world');
  assert.equal(input.country, 'US');
  assert.equal(input.region, 'California');
  assert.equal(input.city, 'San Francisco');
  assert.equal(input.continent, 'NA');
  assert.equal(input.colo, 'SJC');
  assert.equal(input.userAgent, 'UnitTestBrowser/1.0');
  assert.equal(input.referer, 'https://example.com/archive');
  assert.match(input.ipHash ?? '', /^[a-f0-9]{64}$/);
});

test('recordPageView 会把访问记录写入 page_views', async () => {
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

  await recordPageView(db, {
    path: '/blog/hello-world',
    postSlug: 'hello-world',
    ipHash: 'hash',
    country: 'US',
    visitedAt: '2026-04-12T08:00:00.000Z',
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /INSERT INTO page_views/);
  assert.equal(calls[0].values[1], '/blog/hello-world');
  assert.equal(calls[0].values[2], 'hello-world');
  assert.equal(calls[0].values[3], 'hash');
  assert.equal(calls[0].values[4], 'US');
  assert.equal(calls[0].values[11], '2026-04-12T08:00:00.000Z');
});

test('getAnalyticsSummary 会把数据库统计结果转换成数字', async () => {
  const db = {
    prepare() {
      return {
        async first() {
          return {
            total_views: '12',
            unique_visitors: '5',
            article_views: '7',
            tracked_countries: '3',
          };
        },
      };
    },
  } as unknown as D1Database;

  const summary = await getAnalyticsSummary(db);

  assert.deepEqual(summary, {
    totalViews: 12,
    uniqueVisitors: 5,
    articleViews: 7,
    trackedCountries: 3,
  });
});

test('format helpers 会输出稳定的后台展示文本', () => {
  assert.equal(
    formatLocationLabel({ country: 'CN', region: 'Shanghai', city: 'Shanghai' }),
    'Shanghai / Shanghai / CN',
  );
  assert.equal(formatLocationLabel({ country: null, region: null, city: null }), 'Unknown');
  assert.equal(formatIpFingerprint('0123456789abcdef'), '0123456789ab');
  assert.equal(formatIpFingerprint(null), 'Unavailable');
});
