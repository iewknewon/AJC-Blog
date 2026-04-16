# Newspaper Editorial Redesign for Homepage and Article Pages

**Date:** 2026-04-16  
**Status:** Approved direction, ready for implementation planning  
**Scope:** Public homepage (`/`) and public blog article detail page (`/blog/[slug]`) only

## Summary

This redesign applies a strong newspaper typography / editorial print visual language to the public-facing homepage and blog article pages without changing the existing content model, admin flows, learning center, novel management, search behavior, or backend architecture.

The public frontend should feel like a digital newspaper rather than a modern SaaS blog. The redesign will emphasize a masthead, serif-forward hierarchy, paper-toned surfaces, classic rules and dividers, tighter editorial spacing, and immersive long-form reading. The layout should feel intentional and authoritative while remaining responsive and usable on modern devices.

## Goals

- Transform the homepage into a "front page" style editorial landing page.
- Transform article detail pages into immersive long-form reading pages with print-inspired hierarchy.
- Preserve existing routing, data sources, and functional behavior wherever possible.
- Keep mobile readability strong even when desktop layouts use multi-column editorial patterns.
- Maintain existing blog, novel, learning, analytics, WeChat export, and admin functionality.

## Non-Goals

- No redesign of admin pages.
- No redesign of the learning center in this phase.
- No redesign of search, novel reading pages, or dashboard pages in this phase.
- No CMS schema changes or post model changes in this phase.
- No forced removal of existing features such as theme toggle unless implementation planning explicitly decides to limit theme support.

## Design Direction

The chosen direction is a strong editorial treatment:

- Homepage becomes a digital newspaper front page with a masthead, lead story, side columns, and sectioned content rails.
- Article pages become immersive newspaper-style reading pages with large serif headlines, deck text, structured metadata, drop caps, classic rules, and carefully constrained column behavior.
- Visual language should privilege clarity and hierarchy over card-heavy decoration.

This is intentionally more ambitious than a simple skin swap. The effect should be recognizable at a glance.

## Visual Language

### Core Palette

- Paper background: `#FAF8F5`
- Alternate paper / section wash: `#F3EFE8`
- Headline black: `#111827`
- Text gray: `#374151`
- Quiet gray: `#6B7280`
- Accent blue: `#1E3A8A`
- Rule color: `#1F2937`

### Typography

- Display / masthead / headlines: serif-first stack, centered on authority and print tone.
- Body text: serif-first stack for article reading.
- Small metadata and nav labels: restrained sans or small-caps-like serif treatment, depending on implementation practicality.

Preferred stacks:

- Headline and body serif: `'Noto Serif SC', 'Georgia', 'Times New Roman', serif`
- Utility sans fallback when needed: `'Plus Jakarta Sans', 'Segoe UI', sans-serif`

### Surface and Shape

- Remove the dominant rounded-card / soft-shadow language from homepage and article page core zones.
- Prefer flat paper sections, hairline borders, double rules, dotted dividers, and rectangular blocks.
- Use shadows sparingly, if at all.

## Homepage Information Architecture

### 1. Masthead Band

Replace the current sticky product-like header treatment with a newspaper masthead system:

- A slim top information rail with short editorial context, issue-like wording, or rotating descriptor text.
- A large centered masthead title with uppercase styling, wide letter spacing, and bold double rules above and below.
- A secondary section navigation bar below the masthead for `Blog`, `Learning`, `Novels`, `Projects`, `Archive`, and related top-level destinations.

The navigation remains modern in usability, but visually reads like a newspaper section index.

### 2. Front Page Lead Zone

Replace the current hero card with a three-part editorial lead layout:

- Center column: the lead story or featured article.
- Left column: editor's note / site positioning / what this publication focuses on.
- Right column: "In this issue" or quick highlights linking to featured learning content, novels, and notable entries.

Lead story selection:

- First priority: featured post.
- Fallback: newest published post.

Lead story presentation:

- Overline label
- Large serif headline
- Short deck / subtitle
- Metadata strip
- Optional cover image integrated into the layout without looking like a generic card banner

### 3. Secondary Editorial Grid

Below the lead zone, the homepage should become a structured editorial grid rather than a sequence of isolated cards.

Planned sections:

- Featured articles rail
- Latest writing list with varying headline emphasis
- Learning center spotlight block
- Project / experiment column
- Novel / serial spotlight block

Each section should use print-style separators and editorial headings, not generic product-section titles.

### 4. Footer as Colophon

The footer should visually act more like a publication colophon:

- Brand lockup remains
- Navigation remains
- Typography and rules shift toward print closing matter rather than app footer chrome

## Article Detail Page Structure

### 1. Article Header

The article page should open with a strong editorial header rather than a standard centered blog title block.

Header structure:

- Section label / category eyebrow
- Large serif headline
- Deck text / subheadline
- Metadata row including publish date, reading time, and tags
- WeChat export action remains available but is visually integrated as an editorial utility action rather than a primary CTA button cluster

If a cover image exists, it should appear as a deliberate editorial image block rather than a rounded card embed.

### 2. Reading Body

The body should feel like a crafted long-form reading experience:

- Comfortable max width on mobile and tablet
- Single-column reading by default for article body to protect readability
- Selective multi-column treatment only for special areas such as summary blocks, pull quotes, side notes, or related references on wide desktop screens
- First paragraph receives a drop cap treatment
- Heading rhythm becomes more pronounced
- Paragraph spacing tightens slightly to feel print-like without becoming dense
- Links, lists, blockquotes, and code blocks are restyled to match the editorial system

Important constraint:

- Do not force the entire markdown article content into multi-column layout, because long digital reading and embedded elements will suffer.

### 3. Supporting Reading Tools

Existing functionality should remain, but be visually re-integrated:

- Table of contents remains available
- Previous / next post navigation remains
- "Read more" or related exploration block remains
- WeChat export remains

These tools should sit around the article like editorial apparatus, not like dashboard widgets.

### 4. Rich Content Styling

The article content renderer should support a print-inspired treatment for:

- H2 / H3 section headings
- blockquotes as pull-quote style inserts
- code blocks with calmer, higher-contrast treatment that still fits the paper palette
- tables with rule-based styling
- horizontal rules that resemble print section breaks
- figures and captions that look like magazine / newspaper image notes

## Responsive Behavior

### Desktop

- Homepage can use multi-column editorial composition.
- Article page can use a main reading column with supporting rail or floating TOC.
- Masthead is fully expressed.

### Tablet

- Homepage compresses into fewer columns while preserving editorial hierarchy.
- Article page remains mostly single-column with side tools collapsing below or above.

### Mobile

- Homepage collapses into a strong single-column narrative.
- Masthead remains visually prominent but scales down.
- Article body stays single-column.
- Drop cap and headline rhythm remain to preserve identity.

## Existing Data and Functional Reuse

This redesign should reuse the current data flow wherever possible:

- Homepage continues to draw from featured posts, latest posts, projects, learning subject summaries, and novel/public site data already available to the page.
- Article page continues to use existing published-post retrieval and render pipeline.
- No change to slug format, post database schema, or content authoring flow.
- No change to login, analytics collection, or publication logic.

## Component and Styling Strategy

### Rework Existing Public Shell Components

Expected touchpoints:

- `BaseLayout`
- `Header`
- `Footer`
- homepage sections and/or homepage composition
- article page layout
- global typography and spacing tokens

### New Editorial Styling Layer

Implementation should likely introduce a dedicated editorial styling layer rather than trying to force the entire current card system to behave like print.

Possible strategy:

- keep shared utility tokens
- add editorial variables and layout classes
- allow homepage and article page to opt into the editorial system explicitly

This prevents unintended regressions in admin or learning interfaces.

Header and footer scope:

- Shared `Header` and `Footer` components may be updated, but the strongest newspaper masthead / colophon treatment should primarily affect the homepage and blog article detail pages.
- Other public routes may inherit safer typography or spacing token improvements, but should not be unintentionally converted into newspaper layouts during this phase.

## Theme Strategy

Preferred default:

- Light editorial mode becomes the primary public visual identity.

Decision:

- Preserve the existing theme toggle.
- Homepage and article pages must support both light and dark themes in phase 1.
- The light theme carries the full "paper edition" look.
- The dark theme becomes a restrained "night edition" using the same hierarchy and spacing system rather than a second unrelated visual language.

## Accessibility and Readability

- Maintain semantic landmarks and heading structure.
- Keep contrast strong against the paper background.
- Avoid overly narrow letter spacing in Chinese text.
- Keep desktop reading width controlled.
- Ensure keyboard navigation still works for navigation and article utility controls.
- Do not let decorative styling obscure interactive affordances.

## Error Handling and Content Fallbacks

- If no featured post exists, homepage lead story falls back to latest post.
- If no cover image exists, lead and article layouts still feel complete without visual breakage.
- If article metadata is partial, layout still renders cleanly with reduced metadata row.
- If article headings are sparse, TOC behavior should degrade gracefully.

## Regression Boundaries

This redesign must not break:

- admin authentication and admin UI
- article publishing and editing
- WeChat export route
- novel routes and chapter routes
- learning routes
- analytics tracking
- search behavior

## Verification Expectations

At implementation time, verification should include:

- homepage renders correctly on desktop and mobile
- article detail renders correctly with and without cover images
- typography remains readable for long posts
- TOC, export, and post navigation still function
- no regressions to learning, novel, admin, or search routes
- build passes successfully

## Implementation Notes

- Prefer incremental replacement of homepage composition over styling legacy cards into a forced print look.
- Preserve data contracts first; reshape presentation second.
- Add editorial classes surgically so the redesign remains scoped to the intended public pages.

## Final Recommendation

Proceed with an implementation plan for a scoped editorial redesign of:

- homepage
- header / footer treatment needed to support homepage and blog article editorial presentation
- blog article detail page
- public typography tokens and shared editorial styles needed by those pages

Do not expand this phase to the learning center, admin, or novel reading pages until the public editorial shell is stable.
