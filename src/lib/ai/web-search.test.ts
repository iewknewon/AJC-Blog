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
  assert.equal(research.strategy, 'local');
  assert.equal(research.strategyLabel, '本地检索');
});

test('collectWebResearch 会优先使用 OpenAI 原生联网检索', async () => {
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);

    if (url === 'https://api.openai.com/v1/responses') {
      const body = JSON.parse(String(init?.body ?? '{}'));
      assert.equal(body.model, 'gpt-5');

      return new Response(JSON.stringify({
        output_text: JSON.stringify({
          query: 'Cloudflare Pages production deployment',
          summary: '原生联网检索到了部署文档和实战资料，可直接给写作模型作为高可信参考。',
          sources: [
            {
              title: 'Deploy your site to Cloudflare Pages',
              url: 'https://example.com/cloudflare-pages-docs',
              snippet: '介绍如何把站点接入 Cloudflare Pages。',
            },
          ],
        }),
        output: [
          {
            type: 'web_search_call',
            action: {
              sources: [
                {
                  title: 'Cloudflare Pages production checklist',
                  url: 'https://example.com/cloudflare-pages-checklist',
                  snippet: '上线前检查环境变量与构建命令。',
                },
              ],
            },
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

  const research = await collectWebResearch('Cloudflare Pages production deployment', {
    mode: 'auto',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'test-key',
    model: 'gpt-5',
    fetchImpl,
  });

  assert.equal(research.strategy, 'native');
  assert.equal(research.strategyLabel, '模型原生联网');
  assert.equal(research.provider, 'OpenAI Responses API');
  assert.match(research.summary ?? '', /高可信参考/);
  assert.equal(research.sources.length, 2);
});

test('collectWebResearch 会对兼容 baseUrl 尝试 Responses 原生联网', async () => {
  const fetchCalls: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    fetchCalls.push(url);

    if (url === 'https://gateway.example.com/v1/responses') {
      const body = JSON.parse(String(init?.body ?? '{}'));
      assert.equal(body.model, 'gpt-5.4');
      assert.equal(body.tools?.[0]?.type, 'web_search');

      return new Response(JSON.stringify({
        output_text: JSON.stringify({
          query: '最新 HTTP/3 握手变化',
          summary: '兼容 Responses API 的供应商也成功执行了原生联网检索。',
          sources: [
            {
              title: 'HTTP/3 deployment notes',
              url: 'https://example.com/http3-notes',
              snippet: '概述 HTTP/3 部署与握手差异。',
            },
          ],
        }),
      }), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    }

    return new Response('not found', { status: 404 });
  };

  const research = await collectWebResearch('最新 HTTP/3 握手变化', {
    mode: 'auto',
    baseUrl: 'https://gateway.example.com/v1',
    apiKey: 'test-key',
    model: 'gpt-5.4',
    fetchImpl,
  });

  assert.deepEqual(fetchCalls, ['https://gateway.example.com/v1/responses']);
  assert.equal(research.strategy, 'native');
  assert.match(research.provider ?? '', /Responses API/);
  assert.match(research.summary ?? '', /成功执行了原生联网检索/);
  assert.equal(research.sources.length, 1);
});

test('collectWebResearch 会过滤明显不相关的本地搜索结果', async () => {
  const searchXml = `<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title><![CDATA[TCP 三次握手详解]]></title>
      <link>https://example.com/tcp-handshake</link>
      <description><![CDATA[解释 SYN、SYN-ACK 和 ACK 的作用。]]></description>
    </item>
    <item>
      <title><![CDATA[今日厨房灵感]]></title>
      <link>https://example.com/cooking</link>
      <description><![CDATA[分享南瓜浓汤和黄油面包的制作方法。]]></description>
    </item>
    <item>
      <title><![CDATA[前端配色趋势]]></title>
      <link>https://example.com/design</link>
      <description><![CDATA[总结今年流行的按钮渐变与卡片阴影。]]></description>
    </item>
  </channel>
</rss>`;

  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);

    if (url.startsWith('https://www.bing.com/search?format=rss')) {
      return new Response(searchXml, {
        headers: {
          'Content-Type': 'application/rss+xml; charset=utf-8',
        },
      });
    }

    return new Response('not found', { status: 404 });
  };

  const research = await collectWebResearch('TCP 三次握手', {
    searchLimit: 3,
    pageFetchLimit: 0,
    fetchImpl,
  });

  assert.equal(research.strategy, 'local');
  assert.deepEqual(
    research.sources.map((source) => source.title),
    ['TCP 三次握手详解'],
  );
});

test('collectWebResearch 在原生联网失败后会回退到本地检索', async () => {
  const searchXml = `<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title><![CDATA[Fallback guide]]></title>
      <link>https://example.com/fallback-guide</link>
      <description><![CDATA[原生联网失败后改用本地搜索。]]></description>
    </item>
  </channel>
</rss>`;

  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);

    if (url === 'https://api.openai.com/v1/responses') {
      return new Response(JSON.stringify({
        error: {
          message: 'native web search unavailable',
        },
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    }

    if (url.startsWith('https://www.bing.com/search?format=rss')) {
      return new Response(searchXml, {
        headers: {
          'Content-Type': 'application/rss+xml; charset=utf-8',
        },
      });
    }

    if (url === 'https://example.com/fallback-guide') {
      return new Response('<html><body><main>本地搜索仍然成功抓到了页面正文。</main></body></html>', {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    return new Response('not found', { status: 404 });
  };

  const research = await collectWebResearch('fallback deployment guide', {
    mode: 'auto',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'test-key',
    model: 'gpt-5',
    fetchImpl,
  });

  assert.equal(research.strategy, 'local');
  assert.equal(research.strategyLabel, '本地检索（原生联网回退）');
  assert.match(research.fallbackReason ?? '', /native web search unavailable/);
  assert.equal(research.sources.length, 1);
});
