import test from 'node:test';
import assert from 'node:assert/strict';

import { buildWechatExport } from './wechat';

test('buildWechatExport 会生成适合公众号粘贴的 HTML 片段', () => {
  const result = buildWechatExport({
    post: {
      id: 'post-1',
      slug: 'astro-cloudflare-guide',
      title: 'Astro Cloudflare 部署指南',
      description: '一篇适合转成公众号的部署文章。',
      content: '',
      tags: ['Astro', 'Cloudflare'],
      cover: 'https://example.com/cover.jpg',
      featured: false,
      status: 'published',
      publishedAt: new Date('2026-04-01T00:00:00.000Z'),
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-02T00:00:00.000Z'),
    },
    html: `
      <h1 id="astro-cloudflare-guide">Astro Cloudflare 部署指南</h1>
      <p>正文段落。</p>
      <h2 id="step-one">第一步</h2>
      <p><a href="/archive">查看归档</a></p>
      <p><img src="/images/demo.jpg" alt="示例图" /></p>
    `,
    siteTitle: 'AJC 博客',
    siteUrl: 'https://gisgis.eu.cc',
    author: 'AJC',
  });

  assert.match(result.html, /<section style="max-width: 720px;/);
  assert.ok(!result.html.includes('<h1 id="astro-cloudflare-guide">'));
  assert.match(result.html, /<h1 style="margin: 16px 0 12px; font-size: 30px;/);
  assert.match(result.html, /<h2 id="step-one" style="margin: 1.7em 0 0.75em;/);
  assert.match(result.html, /href="https:\/\/gisgis\.eu\.cc\/archive"/);
  assert.match(result.html, /src="https:\/\/gisgis\.eu\.cc\/images\/demo\.jpg"/);
  assert.match(result.html, /原文链接/);
  assert.match(result.plainText, /Astro Cloudflare 部署指南/);
  assert.equal(result.filename, 'astro-cloudflare-guide-wechat.html');
});
