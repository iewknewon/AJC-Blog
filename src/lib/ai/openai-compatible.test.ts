import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWriterPrompt,
  generateCoverSearchQueries,
  generateVisualSearchPlan,
  parseGeneratedPostDraft,
  slugifyTitle,
} from './openai-compatible';

test('slugifyTitle converts plain titles to kebab-case', () => {
  assert.equal(slugifyTitle('Hello Astro World'), 'hello-astro-world');
  assert.equal(slugifyTitle('Cloudflare + Astro'), 'cloudflare-astro');
});

test('parseGeneratedPostDraft parses fenced JSON drafts', () => {
  const draft = parseGeneratedPostDraft(
    '```json\n{"title":"Astro 部署指南","slug":"Astro Deploy Guide","description":"一篇简短摘要","tags":["Astro","Cloudflare"],"content":"# Astro 部署指南\\n\\n开始写作"}\n```',
    '默认主题',
  );

  assert.equal(draft.title, 'Astro 部署指南');
  assert.equal(draft.slug, 'astro-deploy-guide');
  assert.equal(draft.description, '一篇简短摘要');
  assert.deepEqual(draft.tags, ['Astro', 'Cloudflare']);
  assert.match(draft.content, /^# Astro 部署指南/);
});

test('parseGeneratedPostDraft parses frontmatter markdown drafts', () => {
  const draft = parseGeneratedPostDraft(
    `---
title: Astro Cloudflare 部署指南
slug: astro-cloud-deploy
description: 一篇介绍 Astro 部署到 Cloudflare 的文章
tags:
  - Astro
  - Cloudflare
---
# Astro Cloudflare 部署指南

开始写作`,
    '默认主题',
  );

  assert.equal(draft.title, 'Astro Cloudflare 部署指南');
  assert.equal(draft.slug, 'astro-cloud-deploy');
  assert.equal(draft.description, '一篇介绍 Astro 部署到 Cloudflare 的文章');
  assert.deepEqual(draft.tags, ['Astro', 'Cloudflare']);
  assert.match(draft.content, /^# Astro Cloudflare 部署指南/);
});

test('parseGeneratedPostDraft rejects incomplete drafts', () => {
  assert.throws(
    () => parseGeneratedPostDraft('{"title":"Only Title","slug":"only-title","tags":[],"content":""}', '默认主题'),
    /Markdown Frontmatter|AI/,
  );
});

test('buildWriterPrompt includes web research and compact length guidance', () => {
  const prompt = buildWriterPrompt({
    topic: 'Astro + Cloudflare 部署',
    audience: '独立开发者',
    keywords: 'Astro, Cloudflare',
    requirements: '语气自然，步骤清晰',
    customPrompt: '请加入一个简短结论。',
    lengthPreset: 'compact',
    webResearch: {
      query: 'Astro Cloudflare Pages deploy',
      summary: '官方文档和实战资料都强调要确认仓库连接、构建输出目录以及环境变量绑定。',
      strategy: 'native',
      strategyLabel: '模型原生联网',
      sources: [
        {
          title: 'Deploy your Astro site to Cloudflare Pages',
          url: 'https://example.com/docs/astro-cloudflare',
          snippet: 'This guide explains how to deploy Astro to Cloudflare Pages.',
          excerpt: 'Connect your GitHub repository to Cloudflare Pages and configure the build output.',
        },
      ],
    },
  });

  assert.match(prompt, /Astro Cloudflare Pages deploy/);
  assert.match(prompt, /模型原生联网/);
  assert.match(prompt, /资料总览/);
  assert.match(prompt, /Deploy your Astro site to Cloudflare Pages/);
  assert.match(prompt, /GitHub repository/);
  assert.match(prompt, /700/);
  assert.match(prompt, /1100/);
  assert.match(prompt, /简短结论/);
});

test('generateCoverSearchQueries parses model JSON output', async () => {
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
      title: 'Cloudflare 后台配置指南',
      description: '一篇关于仪表盘配置的文章',
      tags: ['Cloudflare', 'Astro'],
      content: '正文内容',
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

test('generateVisualSearchPlan parses cover and illustration plans', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response(JSON.stringify({
    choices: [
      {
        message: {
          content: JSON.stringify({
            coverQueries: ['cloudflare dashboard workspace', 'developer setup'],
            illustrations: [
              {
                heading: '部署流程',
                query: 'deployment workflow diagram',
                alt: '部署流程示意图',
                caption: '用流程图帮助读者理解部署步骤。',
              },
              {
                heading: '后台配置',
                query: 'cloudflare dashboard settings',
                alt: 'Cloudflare 后台设置图',
              },
            ],
          }),
        },
      },
    ],
  }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });

  try {
    const plan = await generateVisualSearchPlan('https://api.example.com/v1', 'test-key', 'test-model', {
      title: 'Cloudflare 部署指南',
      description: '一篇关于部署和后台配置的文章',
      tags: ['Cloudflare', 'Astro'],
      content: '# Cloudflare 部署指南',
      maxIllustrations: 1,
    });

    assert.deepEqual(plan.coverQueries, ['cloudflare dashboard workspace', 'developer setup']);
    assert.equal(plan.illustrations.length, 1);
    assert.equal(plan.illustrations[0]?.heading, '部署流程');
    assert.equal(plan.illustrations[0]?.query, 'deployment workflow diagram');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
