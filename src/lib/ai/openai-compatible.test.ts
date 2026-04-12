import test from 'node:test';
import assert from 'node:assert/strict';

import { buildWriterPrompt, generateCoverSearchQueries, parseGeneratedPostDraft, slugifyTitle } from './openai-compatible';

test('slugifyTitle 会把标题转换为 kebab-case slug', () => {
  assert.equal(slugifyTitle('Hello Astro World'), 'hello-astro-world');
  assert.equal(slugifyTitle('Cloudflare + Astro'), 'cloudflare-astro');
});

test('parseGeneratedPostDraft 会解析 fenced json 并规范 slug', () => {
  const draft = parseGeneratedPostDraft(
    '```json\n{"title":"Astro 部署实践","slug":"Astro Deploy Guide","description":"一篇部署总结","tags":["Astro","Cloudflare"],"content":"# Astro 部署实践\\n\\n正文"}\n```',
    '备用主题',
  );

  assert.equal(draft.title, 'Astro 部署实践');
  assert.equal(draft.slug, 'astro-deploy-guide');
  assert.equal(draft.description, '一篇部署总结');
  assert.deepEqual(draft.tags, ['Astro', 'Cloudflare']);
  assert.match(draft.content, /^# Astro 部署实践/);
});

test('parseGeneratedPostDraft 会解析 frontmatter markdown', () => {
  const draft = parseGeneratedPostDraft(
    `---
title: Astro 云端部署实践
slug: astro-cloud-deploy
description: 一篇关于 Astro 部署的总结
tags:
  - Astro
  - Cloudflare
---
# Astro 云端部署实践

这里是正文。
`,
    '备用主题',
  );

  assert.equal(draft.title, 'Astro 云端部署实践');
  assert.equal(draft.slug, 'astro-cloud-deploy');
  assert.equal(draft.description, '一篇关于 Astro 部署的总结');
  assert.deepEqual(draft.tags, ['Astro', 'Cloudflare']);
  assert.match(draft.content, /^# Astro 云端部署实践/);
});

test('parseGeneratedPostDraft 在缺少必要字段时抛出错误', () => {
  assert.throws(
    () => parseGeneratedPostDraft('{"title":"Only Title","slug":"only-title","tags":[],"content":""}', '备用主题'),
    /结构不完整/,
  );
});

test('buildWriterPrompt 会拼接联网检索资料与自定义提示词', () => {
  const prompt = buildWriterPrompt({
    topic: 'Astro + Cloudflare 部署',
    audience: '前端开发者',
    keywords: 'Astro, Cloudflare',
    requirements: '需要有部署步骤',
    customPrompt: '请写得更像实战复盘。',
    webResearch: {
      query: 'Astro Cloudflare Pages deploy',
      sources: [
        {
          title: 'Deploy your Astro site to Cloudflare Pages',
          url: 'https://example.com/docs/astro-cloudflare',
          snippet: '官方文档介绍如何部署 Astro 到 Cloudflare Pages。',
          excerpt: '在 Cloudflare Pages 中连接 GitHub 仓库后，可以直接从构建产物完成部署。',
        },
      ],
    },
  });

  assert.match(prompt, /联网检索词：Astro Cloudflare Pages deploy/);
  assert.match(prompt, /Deploy your Astro site to Cloudflare Pages/);
  assert.match(prompt, /网页摘录：在 Cloudflare Pages 中连接 GitHub 仓库后/);
  assert.match(prompt, /请写得更像实战复盘/);
});

test('generateCoverSearchQueries 会解析模型返回的 JSON 检索词', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response(JSON.stringify({
    choices: [
      {
        message: {
          content: '{"queries":["cloudflare dashboard workspace","developer laptop setup","server rack deployment"]}',
        },
      },
    ],
  }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });

  try {
    const queries = await generateCoverSearchQueries('https://api.example.com/v1', 'test-key', 'test-model', {
      title: 'Cloudflare 部署复盘',
      description: '记录部署细节',
      tags: ['Cloudflare', 'Astro'],
      content: '这里是正文。',
    });

    assert.deepEqual(queries, [
      'cloudflare dashboard workspace',
      'developer laptop setup',
      'server rack deployment',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
