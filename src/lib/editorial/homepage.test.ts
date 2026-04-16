import test from 'node:test';
import assert from 'node:assert/strict';

import { buildHomepageEdition } from './homepage';

const featuredPosts = [
  {
    slug: 'lead',
    title: 'Lead',
    description: 'Lead story',
    featured: true,
    publishedAt: new Date('2026-04-12T00:00:00.000Z'),
    updatedAt: new Date('2026-04-12T00:00:00.000Z'),
    tags: ['Editorial'],
  },
  {
    slug: 'feature-2',
    title: 'Feature 2',
    description: 'Second feature',
    featured: true,
    publishedAt: new Date('2026-04-10T00:00:00.000Z'),
    updatedAt: new Date('2026-04-10T00:00:00.000Z'),
    tags: ['Engineering'],
  },
];

const latestPosts = [
  {
    slug: 'lead',
    title: 'Lead',
    description: 'Lead story',
    featured: true,
    publishedAt: new Date('2026-04-12T00:00:00.000Z'),
    updatedAt: new Date('2026-04-12T00:00:00.000Z'),
    tags: ['Editorial'],
  },
  {
    slug: 'latest-2',
    title: 'Latest 2',
    description: 'Latest 2',
    featured: false,
    publishedAt: new Date('2026-04-11T00:00:00.000Z'),
    updatedAt: new Date('2026-04-11T00:00:00.000Z'),
    tags: ['Build'],
  },
  {
    slug: 'latest-3',
    title: 'Latest 3',
    description: 'Latest 3',
    featured: false,
    publishedAt: new Date('2026-04-09T00:00:00.000Z'),
    updatedAt: new Date('2026-04-09T00:00:00.000Z'),
    tags: ['Cloudflare'],
  },
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

test('buildHomepageEdition caps the front-page collections used by the homepage layout', () => {
  const edition = buildHomepageEdition({
    featuredPosts: [],
    latestPosts: new Array(8).fill(null).map((_, index) => ({
      slug: `post-${index}`,
      title: `Post ${index}`,
      description: `Post ${index}`,
      featured: false,
      publishedAt: new Date(`2026-04-${String(20 - index).padStart(2, '0')}T00:00:00.000Z`),
      updatedAt: new Date(`2026-04-${String(20 - index).padStart(2, '0')}T00:00:00.000Z`),
      tags: ['Essay'],
    })),
    learningSubjects: [
      { slug: 'networking', title: 'Networking' },
      { slug: 'computer-organization', title: 'Computer Organization' },
      { slug: 'ai-agent-engineering', title: 'AI Agent Engineering' },
    ],
    featuredProjects: [
      { href: '/projects/one', title: 'One' },
      { href: '/projects/two', title: 'Two' },
      { href: '/projects/three', title: 'Three' },
    ],
  });

  assert.equal(edition.latestPosts.length, 5);
  assert.equal(edition.learningSubjects.length, 2);
  assert.equal(edition.featuredProjects.length, 2);
});
