# Newspaper Editorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the public homepage and blog article detail page into a newspaper-style editorial experience without breaking the rest of the site.

**Architecture:** Add a small editorial presentation layer on top of the existing Astro site instead of rewriting the content model. Use one tested helper to build homepage editorial slots, one tested helper to scope the editorial shell to the intended routes, then refactor the homepage, header/footer shell, and article page to consume those helpers and new scoped CSS tokens.

**Tech Stack:** Astro, TypeScript, CSS custom properties, node:test, tsx, existing Astro routing and Cloudflare build pipeline

---

### Task 1: Add tested editorial helpers for homepage slots and route scoping

**Files:**
- Create: `src/lib/editorial/homepage.ts`
- Create: `src/lib/editorial/homepage.test.ts`
- Create: `src/lib/editorial/routes.ts`
- Create: `src/lib/editorial/routes.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing homepage slot tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildHomepageEdition } from './homepage';

const featuredPosts = [
  { slug: 'lead', title: 'Lead', featured: true, publishedAt: new Date('2026-04-12'), updatedAt: new Date('2026-04-12') },
  { slug: 'feature-2', title: 'Feature 2', featured: true, publishedAt: new Date('2026-04-10'), updatedAt: new Date('2026-04-10') },
];

const latestPosts = [
  { slug: 'lead', title: 'Lead', featured: true, publishedAt: new Date('2026-04-12'), updatedAt: new Date('2026-04-12') },
  { slug: 'latest-2', title: 'Latest 2', featured: false, publishedAt: new Date('2026-04-11'), updatedAt: new Date('2026-04-11') },
  { slug: 'latest-3', title: 'Latest 3', featured: false, publishedAt: new Date('2026-04-09'), updatedAt: new Date('2026-04-09') },
];

test('buildHomepageEdition picks the newest featured post as lead and deduplicates rails', () => {
  const edition = buildHomepageEdition({
    featuredPosts,
    latestPosts,
    learningSubjects: [],
    featuredProjects: [],
  });

  assert.equal(edition.leadPost?.slug, 'lead');
  assert.deepEqual(
    edition.secondaryPosts.map((post) => post.slug),
    ['feature-2', 'latest-2', 'latest-3'],
  );
});

test('buildHomepageEdition falls back to latest posts when no featured post exists', () => {
  const edition = buildHomepageEdition({
    featuredPosts: [],
    latestPosts,
    learningSubjects: [],
    featuredProjects: [],
  });

  assert.equal(edition.leadPost?.slug, 'lead');
  assert.deepEqual(edition.secondaryPosts.map((post) => post.slug), ['latest-2', 'latest-3']);
});
```

- [ ] **Step 2: Run the homepage helper test to verify it fails**

Run: `node --import tsx --test src/lib/editorial/homepage.test.ts`  
Expected: FAIL with `Cannot find module './homepage'` or `buildHomepageEdition is not a function`

- [ ] **Step 3: Write the minimal homepage helper**

```ts
type HomepageEditionInput = {
  featuredPosts: Array<{ slug: string; publishedAt: Date | null; updatedAt: Date }>;
  latestPosts: Array<{ slug: string; publishedAt: Date | null; updatedAt: Date }>;
  learningSubjects: unknown[];
  featuredProjects: unknown[];
};

const sortByRecency = <T extends { publishedAt: Date | null; updatedAt: Date }>(items: T[]) =>
  [...items].sort((a, b) => {
    const aTime = (a.publishedAt ?? a.updatedAt).getTime();
    const bTime = (b.publishedAt ?? b.updatedAt).getTime();
    return bTime - aTime;
  });

export function buildHomepageEdition(input: HomepageEditionInput) {
  const orderedFeatured = sortByRecency(input.featuredPosts);
  const orderedLatest = sortByRecency(input.latestPosts);
  const leadPost = orderedFeatured[0] ?? orderedLatest[0] ?? null;
  const seen = new Set(leadPost ? [leadPost.slug] : []);
  const secondaryPosts = [...orderedFeatured.slice(1), ...orderedLatest].filter((post) => {
    if (seen.has(post.slug)) return false;
    seen.add(post.slug);
    return true;
  }).slice(0, 3);

  return {
    leadPost,
    secondaryPosts,
    latestPosts: orderedLatest.filter((post) => post.slug !== leadPost?.slug).slice(0, 5),
    learningSubjects: input.learningSubjects.slice(0, 2),
    featuredProjects: input.featuredProjects.slice(0, 2),
  };
}
```

- [ ] **Step 4: Run the homepage helper test to verify it passes**

Run: `node --import tsx --test src/lib/editorial/homepage.test.ts`  
Expected: PASS

- [ ] **Step 5: Write the failing editorial route scoping tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

import { isEditorialRoute } from './routes';

test('isEditorialRoute matches only homepage and blog detail routes', () => {
  assert.equal(isEditorialRoute('/'), true);
  assert.equal(isEditorialRoute('/blog/cloudflare-pages-env/'), true);
  assert.equal(isEditorialRoute('/blog/cloudflare-pages-env'), true);
  assert.equal(isEditorialRoute('/archive'), false);
  assert.equal(isEditorialRoute('/learn/networking/http-lifecycle'), false);
  assert.equal(isEditorialRoute('/admin/posts'), false);
});
```

- [ ] **Step 6: Run the route helper test to verify it fails**

Run: `node --import tsx --test src/lib/editorial/routes.test.ts`  
Expected: FAIL with `Cannot find module './routes'`

- [ ] **Step 7: Write the minimal route helper**

```ts
export function isEditorialRoute(pathname: string): boolean {
  if (pathname === '/') return true;
  return /^\/blog\/[^/]+\/?$/.test(pathname);
}
```

- [ ] **Step 8: Run the route helper test to verify it passes**

Run: `node --import tsx --test src/lib/editorial/routes.test.ts`  
Expected: PASS

- [ ] **Step 9: Wire the new tests into the main test script**

```json
{
  "scripts": {
    "test": "node --test src/utils/projects.test.js && node --import tsx --test src/utils/posts.test.ts src/lib/editorial/homepage.test.ts src/lib/editorial/routes.test.ts src/lib/posts/repository.test.ts src/lib/posts/markdown.test.ts src/lib/posts/seed.test.ts src/lib/posts/admin-post-route.test.ts src/lib/ai/openai-compatible.test.ts src/lib/ai/presets.test.ts src/lib/ai/web-search.test.ts src/lib/ai/novels.test.ts src/lib/covers/suggestions.test.ts src/lib/covers/cover-route.test.ts src/lib/export/wechat.test.ts src/lib/auth/config.test.ts src/lib/auth/guards.test.ts src/lib/auth/session.test.ts src/lib/auth/login-route.test.ts src/lib/admin/validation.test.ts src/lib/analytics/repository.test.ts src/lib/analytics/page-view-route.test.ts src/lib/learning/content.test.ts src/lib/learning/chat.test.ts src/lib/learning/chat-route.test.ts src/lib/novels/repository.test.ts src/lib/novels/validation.test.ts src/lib/utils/inline-json.test.ts"
  }
}
```

- [ ] **Step 10: Commit the helper groundwork**

```bash
git add package.json src/lib/editorial/homepage.ts src/lib/editorial/homepage.test.ts src/lib/editorial/routes.ts src/lib/editorial/routes.test.ts
git commit -m "feat: add editorial homepage helpers"
```

### Task 2: Add scoped editorial shell styling and newspaper masthead behavior

**Files:**
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/Header.astro`
- Modify: `src/components/Footer.astro`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Write the failing route-aware shell test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

import { isEditorialRoute } from '../lib/editorial/routes';

test('editorial shell remains disabled for non-homepage public routes', () => {
  assert.equal(isEditorialRoute('/projects'), false);
  assert.equal(isEditorialRoute('/novels'), false);
  assert.equal(isEditorialRoute('/tags/cloudflare'), false);
});
```

- [ ] **Step 2: Run the route test to verify it still covers the shell gate**

Run: `node --import tsx --test src/lib/editorial/routes.test.ts`  
Expected: PASS before shell refactor starts

- [ ] **Step 3: Update `BaseLayout.astro` to compute an editorial mode flag and expose it to the shell**

```astro
---
import { isEditorialRoute } from '../lib/editorial/routes';

const editorial = isEditorialRoute(pathname);
---

<body class:list={['site-body', editorial && 'site-body-editorial']}>
  <Header editorial={editorial} />
  <main class:list={['page-shell', editorial && 'page-shell-editorial']}>
    <slot />
  </main>
  <Footer editorial={editorial} />
</body>
```

- [ ] **Step 4: Refactor `Header.astro` into a masthead-style shell for editorial routes while preserving standard nav semantics elsewhere**

```astro
---
interface Props {
  editorial?: boolean;
}

const { editorial = false } = Astro.props;
---

<header class:list={['site-header', editorial && 'site-header-editorial']}>
  {editorial ? (
    <div class="masthead-shell">
      <div class="masthead-meta">Independent Notes • Essays • Learning Dispatches</div>
      <a class="masthead-brand" href="/">
        <span class="masthead-title">AJC JOURNAL</span>
      </a>
      <div class="masthead-nav-row">
        <nav class="nav masthead-nav">
          {navigation.map((item) => (
            <a class:list={['nav-link', (item.href === '/' ? currentPath === '/' : currentPath === item.href || currentPath.startsWith(`${item.href}/`)) && 'is-active']} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </div>
  ) : (
    <div class="container"><div class="header-inner">{/* keep the existing standard header markup unchanged here */}</div></div>
  )}
</header>
```

- [ ] **Step 5: Refactor `Footer.astro` into a colophon-like close for editorial routes**

```astro
---
interface Props {
  editorial?: boolean;
}

const { editorial = false } = Astro.props;
---

<footer class:list={['site-footer', editorial && 'site-footer-editorial']}>
  <div class="container">
    <div class:list={['footer-inner', editorial && 'footer-inner-editorial']}>
      <div class="footer-copy">
        <p class="footer-label">Colophon</p>
        <a class:list={['brand', editorial && 'brand-editorial']} href="/">
          <span class="brand-mark">AJC</span>
          <span class="brand-copy">
            <strong>{siteConfig.title}</strong>
            <span>{siteConfig.footer}</span>
          </span>
        </a>
        <p class="footer-note">{siteConfig.footer}</p>
      </div>
      <nav class:list={['nav', 'footer-nav', editorial && 'footer-nav-editorial']}>
        {navigation.map((item) => (
          <a class="nav-link" href={item.href}>{item.label}</a>
        ))}
      </nav>
    </div>
  </div>
</footer>
```

- [ ] **Step 6: Add editorial tokens and shell rules to `global.css` without changing non-editorial routes**

```css
:root {
  --paper-bg: #faf8f5;
  --paper-bg-alt: #f3efe8;
  --ink-strong: #111827;
  --ink-body: #374151;
  --editorial-accent: #1e3a8a;
  --rule-strong: #1f2937;
}

.site-body-editorial {
  background:
    radial-gradient(circle at top, rgba(30, 58, 138, 0.06), transparent 28%),
    var(--paper-bg);
  color: var(--ink-body);
}

.site-header-editorial {
  position: static;
  border-bottom: none;
  backdrop-filter: none;
  background: transparent;
}

.masthead-shell {
  width: min(1240px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.2rem 0 0.8rem;
}

.masthead-title {
  display: block;
  font-family: "Noto Serif SC", "Georgia", serif;
  font-size: clamp(2.6rem, 7vw, 4.8rem);
  font-weight: 900;
  letter-spacing: 0.18em;
  text-align: center;
  text-transform: uppercase;
  border-top: 3px double var(--rule-strong);
  border-bottom: 3px double var(--rule-strong);
  padding: 1rem 0;
}
```

- [ ] **Step 7: Run the targeted editorial tests and build**

Run: `node --import tsx --test src/lib/editorial/homepage.test.ts src/lib/editorial/routes.test.ts && npm run build`  
Expected: PASS

- [ ] **Step 8: Commit the shell redesign**

```bash
git add src/layouts/BaseLayout.astro src/components/Header.astro src/components/Footer.astro src/styles/global.css
git commit -m "feat: add editorial shell styling"
```

### Task 3: Rebuild the homepage into a front-page editorial layout

**Files:**
- Create: `src/components/editorial/HomepageFrontPage.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Write the failing homepage data-shape test for front-page consumption**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildHomepageEdition } from '../../lib/editorial/homepage';

test('buildHomepageEdition returns capped homepage collections for front-page sections', () => {
  const edition = buildHomepageEdition({
    featuredPosts: [],
    latestPosts: new Array(8).fill(null).map((_, index) => ({
      slug: `post-${index}`,
      title: `Post ${index}`,
      featured: false,
      publishedAt: new Date(`2026-04-${String(20 - index).padStart(2, '0')}`),
      updatedAt: new Date(`2026-04-${String(20 - index).padStart(2, '0')}`),
    })),
    learningSubjects: [{ slug: 'networking' }, { slug: 'computer-organization' }, { slug: 'ai-agent-engineering' }],
    featuredProjects: [{ slug: 'one' }, { slug: 'two' }, { slug: 'three' }],
  });

  assert.equal(edition.latestPosts.length, 5);
  assert.equal(edition.learningSubjects.length, 2);
  assert.equal(edition.featuredProjects.length, 2);
});
```

- [ ] **Step 2: Run the homepage helper test to verify it fails for the new capped collections**

Run: `node --import tsx --test src/lib/editorial/homepage.test.ts`  
Expected: FAIL if the helper does not yet return the capped collections above

- [ ] **Step 3: Extend `buildHomepageEdition` minimally until the new front-page test passes**

```ts
return {
  leadPost,
  secondaryPosts,
  latestPosts: orderedLatest.filter((post) => post.slug !== leadPost?.slug).slice(0, 5),
  learningSubjects: input.learningSubjects.slice(0, 2),
  featuredProjects: input.featuredProjects.slice(0, 2),
};
```

- [ ] **Step 4: Replace the homepage section stack with one front-page component**

```astro
---
import HomepageFrontPage from '../components/editorial/HomepageFrontPage.astro';
import { buildHomepageEdition } from '../lib/editorial/homepage';

const edition = buildHomepageEdition({
  featuredPosts,
  latestPosts,
  learningSubjects,
  featuredProjects,
});
---

<BaseLayout title={siteConfig.title} description={siteConfig.description} pathname="/">
  <HomepageFrontPage edition={edition} />
</BaseLayout>
```

- [ ] **Step 5: Implement `HomepageFrontPage.astro` with lead, editor note, quick rail, and sectioned columns**

```astro
---
interface Props {
  edition: {
    leadPost: any;
    secondaryPosts: any[];
    latestPosts: any[];
    learningSubjects: any[];
    featuredProjects: any[];
  };
}

const { edition } = Astro.props;
---

<section class="front-page">
  <div class="container front-page-grid">
    <aside class="front-page-note">
      <p class="front-page-note-label">Editor's Note</p>
      <h2>Writing, systems, experiments, and ongoing study.</h2>
      <p>{siteConfig.description}</p>
    </aside>
    <article class="front-page-lead">
      <p class="front-page-overline">Lead Story</p>
      <h1 class="front-page-lead-title">
        <a href={`/blog/${edition.leadPost.slug}/`}>{edition.leadPost.title}</a>
      </h1>
      <p class="front-page-lead-deck">{edition.leadPost.description}</p>
      <div class="front-page-meta-row">
        <span>{formatDate(edition.leadPost.publishedAt ?? edition.leadPost.updatedAt)}</span>
        <span>{edition.leadPost.tags?.[0] ?? 'Essay'}</span>
      </div>
    </article>
    <aside class="front-page-rail">
      <p class="front-page-rail-label">In This Issue</p>
      <ul class="front-page-rail-list">
        {edition.secondaryPosts.map((post) => (
          <li><a href={`/blog/${post.slug}/`}>{post.title}</a></li>
        ))}
      </ul>
    </aside>
  </div>
  <div class="container front-page-sections">
    <section class="front-page-section">
      <p class="front-page-section-label">Latest Dispatches</p>
      <ul class="front-page-story-list">
        {edition.latestPosts.map((post) => (
          <li><a href={`/blog/${post.slug}/`}>{post.title}</a></li>
        ))}
      </ul>
    </section>
    <section class="front-page-section">
      <p class="front-page-section-label">Study & Projects</p>
      <div class="front-page-mini-grid">
        {edition.learningSubjects.map((subject) => (
          <a href={`/learn/${subject.slug}/`}>{subject.title}</a>
        ))}
        {edition.featuredProjects.map((project) => (
          <a href={project.href}>{project.title}</a>
        ))}
      </div>
    </section>
  </div>
</section>
```

- [ ] **Step 6: Add homepage-specific editorial CSS without regressing non-homepage sections**

```css
.front-page {
  padding: 1.5rem 0 4rem;
}

.front-page-grid {
  display: grid;
  grid-template-columns: 0.9fr 1.5fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

.front-page-lead {
  border-top: 3px double var(--rule-strong);
  border-bottom: 1px solid color-mix(in srgb, var(--rule-strong) 30%, white);
  padding: 1.25rem 0 1.5rem;
}

.front-page-lead-title {
  font-family: "Noto Serif SC", "Georgia", serif;
  font-size: clamp(2rem, 4vw, 3.3rem);
  line-height: 1.1;
  margin: 0.5rem 0 0.9rem;
}
```

- [ ] **Step 7: Run the helper test and build to verify the front page works**

Run: `node --import tsx --test src/lib/editorial/homepage.test.ts && npm run build`  
Expected: PASS

- [ ] **Step 8: Commit the homepage redesign**

```bash
git add src/components/editorial/HomepageFrontPage.astro src/pages/index.astro src/styles/global.css src/lib/editorial/homepage.ts src/lib/editorial/homepage.test.ts
git commit -m "feat: redesign homepage as front page"
```

### Task 4: Redesign the article detail page into an immersive editorial reading page

**Files:**
- Modify: `src/pages/blog/[slug].astro`
- Modify: `src/components/TableOfContents.astro`
- Modify: `src/components/PostNavigation.astro`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Write the failing route test for blog detail coverage**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

import { isEditorialRoute } from '../lib/editorial/routes';

test('isEditorialRoute keeps blog detail pages in editorial mode', () => {
  assert.equal(isEditorialRoute('/blog/editorial-redesign/'), true);
});
```

- [ ] **Step 2: Run the route helper test to verify article coverage still passes before markup work**

Run: `node --import tsx --test src/lib/editorial/routes.test.ts`  
Expected: PASS

- [ ] **Step 3: Refactor `src/pages/blog/[slug].astro` into a newspaper-style article layout**

```astro
<div class="container article-layout article-layout-editorial">
  <article class="article-shell article-shell-editorial">
    <header class="article-header">
      <p class="article-kicker">{post.tags[0] ?? 'Essay'}</p>
      <h1 class="article-headline">{post.title}</h1>
      <p class="article-deck">{post.description}</p>
      <div class="article-meta-strip">
        <span>{formatDate(publishDate)}</span>
        <span>{readingTime}</span>
        {post.tags.map((tag) => (
          <a href={`/tags/${encodeURIComponent(tag)}/`}>{tag}</a>
        ))}
      </div>
    </header>

    {post.cover ? (
      <figure class="article-cover article-cover-editorial">
        <img src={post.cover} alt={`${post.title} cover`} loading="eager" decoding="async" />
      </figure>
    ) : null}

    <div class="article-utility-bar">
      <a class="button button-editorial" href={`/blog/${post.slug}/wechat/`}>Export for WeChat</a>
    </div>

    <div class="article-content article-content-editorial" set:html={renderedPost.html}></div>
    <PostNavigation previous={adjacentPosts.previous} next={adjacentPosts.next} />
  </article>
  <TableOfContents headings={renderedPost.headings} />
</div>
```

- [ ] **Step 4: Restyle `TableOfContents.astro` and `PostNavigation.astro` as editorial apparatus**

```astro
<aside class="toc toc-editorial">
  <p class="toc-label">In This Article</p>
  <h3 class="toc-heading">Contents</h3>
  <ul>
    {items.map((heading) => (
      <li class:list={['toc-item', heading.depth > 2 && 'is-sub']}>
        <a href={`#${heading.slug}`}>{heading.text}</a>
      </li>
    ))}
  </ul>
</aside>
```

```astro
<div class="post-nav post-nav-editorial">
  <a class="post-nav-card post-nav-card-editorial" href={`/blog/${previous.slug}/`}>
    <p class="meta">Previous</p>
    <h3>{previous.title}</h3>
  </a>
  <a class="post-nav-card post-nav-card-editorial" href={`/blog/${next.slug}/`}>
    <p class="meta">Next</p>
    <h3>{next.title}</h3>
  </a>
</div>
```

- [ ] **Step 5: Add article editorial CSS including drop cap, rule-based typography, and responsive side rail behavior**

```css
.article-shell-editorial {
  background: transparent;
  border: none;
  box-shadow: none;
  border-radius: 0;
}

.article-headline {
  font-family: "Noto Serif SC", "Georgia", serif;
  font-size: clamp(2.5rem, 5vw, 4.4rem);
  line-height: 1.08;
  margin: 0;
}

.article-content-editorial > p:first-of-type::first-letter {
  float: left;
  font-size: 4.5rem;
  line-height: 0.85;
  font-weight: 900;
  color: var(--editorial-accent);
  margin-right: 0.15rem;
  margin-top: 0.08rem;
}

.article-content-editorial blockquote {
  border-left: none;
  border-top: 3px double var(--editorial-accent);
  border-bottom: 1px solid color-mix(in srgb, var(--editorial-accent) 30%, white);
  margin: 2rem 0;
  padding: 1rem 0;
}
```

- [ ] **Step 6: Run targeted editorial tests and a build**

Run: `node --import tsx --test src/lib/editorial/routes.test.ts && npm run build`  
Expected: PASS

- [ ] **Step 7: Commit the article redesign**

```bash
git add src/pages/blog/[slug].astro src/components/TableOfContents.astro src/components/PostNavigation.astro src/styles/global.css
git commit -m "feat: redesign article reading experience"
```

### Task 5: Regression verification and final integration pass

**Files:**
- Modify: `docs/superpowers/plans/2026-04-16-newspaper-editorial-redesign.md`

- [ ] **Step 1: Run the focused editorial tests together**

Run: `node --import tsx --test src/lib/editorial/homepage.test.ts src/lib/editorial/routes.test.ts`  
Expected: PASS

- [ ] **Step 2: Run the full project test suite**

Run: `npm test`  
Expected: PASS

- [ ] **Step 3: Run the production build**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 4: Inspect the final diff before handoff**

Run: `git -c safe.directory=E:/personalBlog diff --stat HEAD~4..HEAD`  
Expected: Changed files remain scoped to editorial helpers, public shell, homepage, article page, and plan docs

- [ ] **Step 5: Mark completed steps in this plan and commit the integration pass**

```bash
git add docs/superpowers/plans/2026-04-16-newspaper-editorial-redesign.md
git commit -m "docs: mark editorial redesign plan complete"
```
