import test from 'node:test';
import assert from 'node:assert/strict';

import { parseGeneratedPostDraft, slugifyTitle } from './openai-compatible';

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

test('parseGeneratedPostDraft 在缺少必要字段时抛出错误', () => {
  assert.throws(
    () => parseGeneratedPostDraft('{"title":"Only Title","slug":"only-title","tags":[],"content":""}', '备用主题'),
    /结构不完整/,
  );
});
