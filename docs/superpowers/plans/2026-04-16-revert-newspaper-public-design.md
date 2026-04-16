# Revert Newspaper Public Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the pre-newspaper homepage and article reading experience without reintroducing the garbled shared Chinese brand copy.

**Architecture:** Use a targeted rollback instead of a repository-wide revert. Restore the public shell and page composition to their pre-editorial state, keep the shared brand copy sourced from `src/lib/site/brand-copy.ts`, and then remove the now-unused editorial-only helpers, components, and tests.

**Tech Stack:** Astro, TypeScript, node:test, CSS, Git

---

## File Map

- Modify: `src/pages/index.astro`
- Modify: `src/pages/blog/[slug].astro`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/Header.astro`
- Modify: `src/components/Footer.astro`
- Modify: `src/components/PostNavigation.astro`
- Modify: `src/components/TableOfContents.astro`
- Modify: `src/styles/global.css`
- Modify: `package.json`
- Create: `src/lib/editorial/rollback.test.ts`
- Delete: `src/components/editorial/HomepageFrontPage.astro`
- Delete: `src/lib/editorial/homepage.ts`
- Delete: `src/lib/editorial/homepage.test.ts`
- Delete: `src/lib/editorial/routes.ts`
- Delete: `src/lib/editorial/routes.test.ts`

### Task 1: Add rollback regression coverage

**Files:**
- Create: `src/lib/editorial/rollback.test.ts`
- Modify: `package.json`
- Test: `src/lib/editorial/rollback.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test src/lib/editorial/rollback.test.ts`

Expected: FAIL because `HomepageFrontPage`, `getEditorialRouteKind`, or editorial-only files still exist.

- [ ] **Step 3: Register the regression test in the full test script**

```json
"test": "node --test src/utils/projects.test.js && node --import tsx --test src/data/site.test.ts src/utils/posts.test.ts src/lib/editorial/rollback.test.ts ..."
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/editorial/rollback.test.ts package.json
git commit -m "test: add rollback coverage for editorial public shell"
```

### Task 2: Restore the public shell and page composition

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/pages/blog/[slug].astro`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/Header.astro`
- Modify: `src/components/Footer.astro`
- Modify: `src/components/PostNavigation.astro`
- Modify: `src/components/TableOfContents.astro`
- Modify: `src/styles/global.css`
- Test: `src/lib/editorial/rollback.test.ts`

- [ ] **Step 1: Restore the homepage to the pre-editorial composition**

```astro
import BaseLayout from '../layouts/BaseLayout.astro';
import HeroSection from '../components/HeroSection.astro';
import TechStackSection from '../components/TechStackSection.astro';
import FeaturedProjectsSection from '../components/FeaturedProjectsSection.astro';
import FeaturedPostsSection from '../components/FeaturedPostsSection.astro';
import LatestPostsSection from '../components/LatestPostsSection.astro';
import ContactSection from '../components/ContactSection.astro';
import EmptyState from '../components/EmptyState.astro';
import LearningSection from '../components/LearningSection.astro';
import { siteConfig } from '../data/site';
import { projects } from '../data/projects';
import { getLearningSubjects } from '../lib/learning/content';
import { getFeaturedPosts, getLatestPosts } from '../utils/posts';
```

- [ ] **Step 2: Restore the article page to the simpler reading-first layout**

```astro
<BaseLayout
  title={post ? `${post.title} | ${siteConfig.title}` : `文章详情 | ${siteConfig.title}`}
  description={post?.description ?? '当前环境还没有连上内容数据库。'}
  pathname={post ? `/blog/${post.slug}/` : `/blog/${slug}/`}
>
  {post && renderedPost && publishDate ? (
    <div class="container article-layout">
      <article class="article-shell">
        <p class="eyebrow">技术文章</p>
        <h1>{post.title}</h1>
        <p class="page-intro">{post.description}</p>
        ...
      </article>
      <TableOfContents headings={renderedPost.headings} />
    </div>
  ) : (
    ...
  )}
</BaseLayout>
```

- [ ] **Step 3: Remove editorial routing from the shared layout**

```astro
<body>
  <Header />
  <main class="page-shell">
    <slot />
  </main>
  <Footer />
</body>
```

- [ ] **Step 4: Restore the normal shared header/footer while preserving brand copy**

```astro
<a class="brand" href="/">
  <span class="brand-mark">AJC</span>
  <span class="brand-copy">
    <strong>{siteConfig.title}</strong>
    <span>{siteConfig.brand.headerTagline}</span>
  </span>
</a>
```

```astro
<a class="brand brand-footer" href="/">
  <span class="brand-mark">AJC</span>
  <span class="brand-copy">
    <strong>{siteConfig.title}</strong>
    <span>{siteConfig.brand.footerTagline}</span>
  </span>
</a>
```

- [ ] **Step 5: Restore pre-editorial TOC and post-navigation copy**

```astro
<div class="post-nav">
  ...
  <p class="meta">上一篇</p>
  ...
</div>
```

```astro
<aside class="content-card toc" aria-label="Table of contents">
  ...
</aside>
```

- [ ] **Step 6: Restore the pre-editorial global stylesheet**

Run: `git diff f5851d5^ -- src/styles/global.css`

Expected: confirm only newspaper/editorial CSS is being removed and base site styles remain.

- [ ] **Step 7: Run targeted rollback test to verify it passes**

Run: `node --import tsx --test src/lib/editorial/rollback.test.ts`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/pages/index.astro src/pages/blog/[slug].astro src/layouts/BaseLayout.astro src/components/Header.astro src/components/Footer.astro src/components/PostNavigation.astro src/components/TableOfContents.astro src/styles/global.css
git commit -m "fix: restore pre-editorial public layouts"
```

### Task 3: Remove dead editorial files and re-verify the app

**Files:**
- Delete: `src/components/editorial/HomepageFrontPage.astro`
- Delete: `src/lib/editorial/homepage.ts`
- Delete: `src/lib/editorial/homepage.test.ts`
- Delete: `src/lib/editorial/routes.ts`
- Delete: `src/lib/editorial/routes.test.ts`
- Modify: `package.json`
- Test: `src/lib/editorial/rollback.test.ts`

- [ ] **Step 1: Delete the unused editorial-only files**

```bash
Remove:
- src/components/editorial/HomepageFrontPage.astro
- src/lib/editorial/homepage.ts
- src/lib/editorial/homepage.test.ts
- src/lib/editorial/routes.ts
- src/lib/editorial/routes.test.ts
```

- [ ] **Step 2: Remove deleted editorial tests from the full test script**

```json
"test": "node --test src/utils/projects.test.js && node --import tsx --test src/data/site.test.ts src/utils/posts.test.ts src/lib/editorial/rollback.test.ts ..."
```

- [ ] **Step 3: Run targeted rollback test again**

Run: `node --import tsx --test src/lib/editorial/rollback.test.ts`

Expected: PASS with both assertions green.

- [ ] **Step 4: Run the full test suite**

Run: `cmd /c npm test`

Expected: PASS, 0 failures.

- [ ] **Step 5: Run the production build**

Run: `cmd /c npm run build`

Expected: PASS, Astro build completes successfully.

- [ ] **Step 6: Commit**

```bash
git add package.json src/lib/editorial/rollback.test.ts
git rm src/components/editorial/HomepageFrontPage.astro src/lib/editorial/homepage.ts src/lib/editorial/homepage.test.ts src/lib/editorial/routes.ts src/lib/editorial/routes.test.ts
git commit -m "refactor: remove unused editorial public rollback code"
```
