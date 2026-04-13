import test from 'node:test';
import assert from 'node:assert/strict';

import { validateNovelProjectInput } from './validation';

test('validateNovelProjectInput 在必填字段齐全时通过', () => {
  const result = validateNovelProjectInput({
    slug: 'token-emperor',
    title: '斗破苍穹番外篇之 Token 大帝',
    premise: '萧炎离开后，新的异火纷争出现。',
    genre: '玄幻',
    status: 'planning',
  });

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.equal(result.data.slug, 'token-emperor');
  assert.equal(result.data.status, 'planning');
});

test('validateNovelProjectInput 在缺少标题和设定时返回错误', () => {
  const result = validateNovelProjectInput({
    slug: 'bad slug',
    title: '',
    premise: '',
  });

  assert.equal(result.success, false);

  if (result.success) {
    return;
  }

  assert.match(result.fieldErrors.slug ?? '', /Slug/);
  assert.match(result.fieldErrors.title ?? '', /不能为空/);
  assert.match(result.fieldErrors.premise ?? '', /不能为空/);
});
