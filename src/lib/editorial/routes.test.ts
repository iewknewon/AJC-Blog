import test from 'node:test';
import assert from 'node:assert/strict';

import { getEditorialRouteKind, isEditorialRoute } from './routes';

test('isEditorialRoute matches only homepage and blog detail routes', () => {
  assert.equal(isEditorialRoute('/'), true);
  assert.equal(isEditorialRoute('/blog/cloudflare-pages-env/'), true);
  assert.equal(isEditorialRoute('/blog/cloudflare-pages-env'), true);
  assert.equal(isEditorialRoute('/archive'), false);
  assert.equal(isEditorialRoute('/learn/networking/http-lifecycle'), false);
  assert.equal(isEditorialRoute('/admin/posts'), false);
});

test('isEditorialRoute keeps unrelated public routes out of editorial mode', () => {
  assert.equal(isEditorialRoute('/projects'), false);
  assert.equal(isEditorialRoute('/novels'), false);
  assert.equal(isEditorialRoute('/tags/cloudflare'), false);
});

test('isEditorialRoute keeps blog detail pages in editorial mode', () => {
  assert.equal(isEditorialRoute('/blog/editorial-redesign/'), true);
});

test('getEditorialRouteKind separates homepage and article presentation modes', () => {
  assert.equal(getEditorialRouteKind('/'), 'home');
  assert.equal(getEditorialRouteKind('/blog/editorial-redesign/'), 'article');
  assert.equal(getEditorialRouteKind('/learn/networking/http-lifecycle'), 'none');
});
