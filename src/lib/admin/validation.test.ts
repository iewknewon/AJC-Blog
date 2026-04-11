import test from 'node:test';
import assert from 'node:assert/strict';

import { validatePostInput } from './validation';

test('validatePostInput 会把表单输入转换成可保存的文章数据', () => {
  const result = validatePostInput({
    slug: ' hello-astro ',
    title: '  Hello Astro  ',
    description: '  一篇测试文章  ',
    content: '# Title\n\ncontent',
    tags: 'Astro, Cloudflare，部署',
    cover: 'https://example.com/cover.png',
    featured: 'on',
    status: 'published',
  });

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.deepEqual(result.data, {
    slug: 'hello-astro',
    title: 'Hello Astro',
    description: '一篇测试文章',
    content: '# Title\n\ncontent',
    tags: ['Astro', 'Cloudflare', '部署'],
    cover: 'https://example.com/cover.png',
    featured: true,
    status: 'published',
  });
});

test('validatePostInput 会拒绝非法 slug 和空正文', () => {
  const result = validatePostInput({
    slug: 'Hello Astro',
    title: 'Title',
    description: 'Desc',
    content: '   ',
    tags: 'Astro',
    cover: '',
    featured: '',
    status: 'draft',
  });

  assert.equal(result.success, false);

  if (result.success) {
    return;
  }

  assert.match(result.message, /请检查文章信息/);
  assert.equal(result.fieldErrors.slug, 'Slug 仅支持小写字母、数字和中划线');
  assert.equal(result.fieldErrors.content, '正文不能为空');
});

test('validatePostInput 会拒绝非 http 的封面地址和空标签', () => {
  const result = validatePostInput({
    slug: 'valid-slug',
    title: 'Title',
    description: 'Desc',
    content: 'Body',
    tags: '， ,  ',
    cover: 'ftp://example.com/cover.png',
    featured: '',
    status: 'draft',
  });

  assert.equal(result.success, false);

  if (result.success) {
    return;
  }

  assert.equal(result.fieldErrors.tags, '请至少填写一个标签');
  assert.equal(result.fieldErrors.cover, '封面地址必须是 http 或 https URL');
});
