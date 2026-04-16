import test from 'node:test';
import assert from 'node:assert/strict';

import { brandCopy } from '../lib/site/brand-copy';

test('brandCopy exposes readable taglines for header and footer', () => {
  assert.equal(brandCopy.headerTagline, '写作、项目与连载档案');
  assert.equal(brandCopy.footerTagline, '长期写作与作品沉淀');
});
