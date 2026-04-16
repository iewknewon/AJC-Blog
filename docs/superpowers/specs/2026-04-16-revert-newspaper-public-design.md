# Revert Newspaper Styling on Public Pages

**Date:** 2026-04-16  
**Status:** Approved direction, ready for implementation planning  
**Scope:** Public homepage (`/`) and public blog article detail page (`/blog/[slug]`) only

## Summary

This change intentionally rolls back the newspaper / editorial redesign that was introduced for the public homepage and public article pages, while preserving later non-visual fixes such as the repaired shared Chinese brand copy.

The goal is not to revert the entire repository to an earlier commit. The goal is to restore the pre-editorial public reading experience and remove the newspaper presentation layer that is now hurting usability.

## Goals

- Restore the public homepage to its pre-newspaper visual structure.
- Restore public blog article pages to their pre-newspaper reading layout.
- Keep the later shared brand-copy fix so header and footer text remains readable.
- Keep all non-style functionality added before and after the newspaper redesign.
- Remove editorial-specific logic that no longer has an active consumer.

## Non-Goals

- No rollback of admin, learning center, novels, analytics, or AI-writing features.
- No rollback of the repaired header/footer copy.
- No new visual redesign in this task.
- No schema, routing, or content-model changes outside what is required to remove editorial mode.

## Chosen Approach

Use a **targeted manual rollback** of the newspaper redesign.

This means:

- revert the homepage/article presentation code introduced by commits `f5851d5` and `4ced546`
- preserve later unrelated fixes, especially commit `ad1a107`
- keep the repository at current HEAD, but remove only the editorial presentation layer

This is preferred over a raw `git revert` because the repository has already moved forward and we only want to unwind the public styling changes.

## Public Experience After Rollback

### Homepage

- Remove the newspaper masthead and front-page composition.
- Restore the normal site homepage structure and visual rhythm.
- Keep the current readable Chinese site title / copy in the shared header and footer.

### Article Detail

- Remove the article-specific editorial header treatment.
- Restore the simpler reading-first article layout that existed before the newspaper redesign.
- Keep article functionality such as TOC, post navigation, and export intact.

### Shared Shell

- Shared `Header` and `Footer` return to the pre-newspaper public style.
- Shared header/footer must continue to use the repaired brand-copy source so the previous garbled text does not come back.

## Code Strategy

Expected implementation strategy:

- compare current files against the last pre-newspaper state
- manually restore the old homepage/article markup and supporting shell behavior
- keep any later correctness fixes that are unrelated to the editorial styling
- remove unused editorial helper code, components, and CSS once public routes no longer depend on them

Likely touchpoints:

- `src/pages/index.astro`
- `src/pages/blog/[slug].astro`
- `src/components/Header.astro`
- `src/components/Footer.astro`
- `src/layouts/BaseLayout.astro`
- `src/styles/global.css`
- `src/lib/editorial/*`
- `src/components/editorial/*`

## Cleanup Rules

- If editorial route helpers are no longer needed, delete them.
- If the editorial homepage component is no longer referenced, delete it.
- Remove or shrink editorial-only CSS so the stylesheet reflects the restored UI.
- Do not delete shared components or tests that still serve the restored layout.

## Verification

Implementation is complete only if:

- homepage visually matches the pre-newspaper structure again
- article pages no longer use the editorial newspaper shell
- header and footer still show readable Chinese copy
- existing tests pass
- build passes

## Final Recommendation

Proceed with a scoped rollback of the newspaper presentation layer only, preserving all later functional work and the repaired shared brand copy.
