import test from 'node:test';
import assert from 'node:assert/strict';

import { renderMarkdown } from './markdown';

test('renderMarkdown 会输出安全 HTML、目录和纯文本', async () => {
  const rendered = await renderMarkdown(`## Intro\n\n正文 **加粗**。\n\n<script>alert('xss')</script>\n\n### Details\n\n更多内容。`);

  assert.match(rendered.html, /<h2 id="intro">Intro<\/h2>/);
  assert.match(rendered.html, /<h3 id="details">Details<\/h3>/);
  assert.ok(!rendered.html.includes('<script>'));
  assert.deepEqual(rendered.headings, [
    { depth: 2, slug: 'intro', text: 'Intro' },
    { depth: 3, slug: 'details', text: 'Details' },
  ]);
  assert.match(rendered.plainText, /正文 加粗/);
});
