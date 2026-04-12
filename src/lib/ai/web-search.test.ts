import test from 'node:test';
import assert from 'node:assert/strict';

import { collectWebResearch, htmlToPlainText, parseBingSearchResults } from './web-search';

test('htmlToPlainText 会去掉脚本并解码 HTML 实体', () => {
  const text = htmlToPlainText('<main>部署 &amp; 复盘<script>alert(1)</script><p>正文&nbsp;内容</p></main>');

  assert.equal(text, '部署 & 复盘 正文 内容');
});

test('parseBingSearchResults 会解析 RSS 搜索结果', () => {
  const results = parseBingSearchResults(`<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title><![CDATA[Astro &amp; Cloudflare 部署]]></title>
      <link>https://example.com/astro-cloudflare</link>
      <description><![CDATA[一篇关于 <b>Cloudflare Pages</b> 的部署总结。]]></description>
    </item>
    <item>
      <title><![CDATA[第二条结果]]></title>
      <link>javascript:void(0)</link>
      <description>无效链接</description>
    </item>
  </channel>
</rss>`);

  assert.deepEqual(results, [
    {
      title: 'Astro & Cloudflare 部署',
      url: 'https://example.com/astro-cloudflare',
      snippet: '一篇关于 Cloudflare Pages 的部署总结。',
    },
  ]);
});

test('collectWebResearch 会合并搜索摘要与网页摘录', async () => {
  const fetchCalls: string[] = [];
  const searchXml = `<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title><![CDATA[Astro Cloudflare 指南]]></title>
      <link>https://example.com/guide</link>
      <description><![CDATA[部署到 Cloudflare Pages 的官方流程。]]></description>
    </item>
    <item>
      <title><![CDATA[Astro Cloudflare 实战]]></title>
      <link>https://example.com/case</link>
      <description><![CDATA[记录真实项目的踩坑与修复。]]></description>
    </item>
  </channel>
</rss>`;

  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    fetchCalls.push(url);

    if (url.startsWith('https://www.bing.com/search?format=rss')) {
      return new Response(searchXml, {
        headers: {
          'Content-Type': 'application/rss+xml; charset=utf-8',
        },
      });
    }

    if (url === 'https://example.com/guide') {
      return new Response('<html><body><main>先连接 GitHub，再配置构建命令与输出目录。</main></body></html>', {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    if (url === 'https://example.com/case') {
      return new Response('生产环境里要确认环境变量和数据库绑定都已就绪。', {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }

    return new Response('not found', { status: 404 });
  };

  const research = await collectWebResearch('Astro Cloudflare 部署', {
    searchLimit: 2,
    pageFetchLimit: 2,
    fetchImpl,
  });

  assert.equal(research.query, 'Astro Cloudflare 部署');
  assert.equal(research.sources.length, 2);
  assert.match(research.sources[0].excerpt ?? '', /先连接 GitHub/);
  assert.match(research.sources[1].excerpt ?? '', /环境变量和数据库绑定/);
  assert.equal(fetchCalls.length, 3);
});
