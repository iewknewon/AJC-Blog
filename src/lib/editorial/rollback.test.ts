import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('public homepage and article stop wiring editorial presentation', () => {
  const homepage = read('../../pages/index.astro');
  const article = read('../../pages/blog/[slug].astro');
  const layout = read('../../layouts/BaseLayout.astro');
  const header = read('../../components/Header.astro');
  const footer = read('../../components/Footer.astro');

  assert.doesNotMatch(homepage, /HomepageFrontPage|buildHomepageEdition/);
  assert.doesNotMatch(article, /editorial-article|article-shell-editorial|article-layout-editorial/);
  assert.doesNotMatch(layout, /getEditorialRouteKind|isEditorialRoute|editorialKind/);
  assert.doesNotMatch(header, /masthead-shell|editorial-article-bar/);
  assert.doesNotMatch(footer, /site-footer-editorial|footer-inner-editorial|brand-editorial/);
});

test('editorial-only helpers are removed after the public rollback', () => {
  assert.equal(existsSync(new URL('../../components/editorial/HomepageFrontPage.astro', import.meta.url)), false);
  assert.equal(existsSync(new URL('./homepage.ts', import.meta.url)), false);
  assert.equal(existsSync(new URL('./routes.ts', import.meta.url)), false);
});
