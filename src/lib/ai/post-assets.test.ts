import test from 'node:test';
import assert from 'node:assert/strict';

import { injectInlineIllustrations } from './post-assets';

test('injectInlineIllustrations 会按小节标题插入插图和来源说明', () => {
  const markdown = `# 标题

## 部署流程

先准备账号和仓库。

## 配置环境

再补齐环境变量。`;

  const enriched = injectInlineIllustrations(markdown, [
    {
      heading: '部署流程',
      query: 'deployment workflow diagram',
      alt: '部署流程示意图',
      caption: '帮助读者快速理解部署顺序。',
      imageUrl: 'https://example.com/flow.png',
      previewUrl: 'https://example.com/flow-thumb.png',
      creator: 'Jane Doe',
      license: 'CC0',
      sourceUrl: 'https://example.com/flow',
    },
  ]);

  assert.match(enriched, /## 部署流程[\s\S]*!\[部署流程示意图\]\(https:\/\/example\.com\/flow\.png\)/);
  assert.match(enriched, /> 配图说明：帮助读者快速理解部署顺序。/);
  assert.match(enriched, /> 图片来源：作者：Jane Doe，许可：CC0，\[查看来源\]\(https:\/\/example\.com\/flow\)/);
});

test('injectInlineIllustrations 在找不到匹配小节时会回退到其他小节或末尾', () => {
  const markdown = `# 标题

## 现状分析

这里是正文。`;

  const enriched = injectInlineIllustrations(markdown, [
    {
      heading: '并不存在的小节',
      query: 'workspace setup',
      alt: '工作台示意图',
      imageUrl: 'https://example.com/setup.png',
      previewUrl: 'https://example.com/setup-thumb.png',
    },
  ]);

  assert.match(enriched, /!\[工作台示意图\]\(https:\/\/example\.com\/setup\.png\)/);
});
