import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildContinuationBlueprint,
  buildContinuationPlanItems,
  buildFallbackContinuationRelatedLessonSlugs,
  coerceContinuationCount,
} from './continuation';
import type { ManagedLearningSubject } from './types';

function makeTrack(lessonCount = 2): ManagedLearningSubject {
  return {
    id: 'track-1',
    slug: 'networking',
    title: 'Networking',
    shortTitle: 'Network',
    description: 'desc',
    eyebrow: 'Learning Track',
    colorToken: 'learning',
    icon: 'NW',
    pageVariant: 'default',
    learningPath: ['Layers', 'Requests', 'Transport'],
    conceptOverview: null,
    stageSlug: 'fundamentals',
    status: 'draft',
    sourcePrompt: 'teach networking',
    lessonsCount: lessonCount,
    createdAt: new Date('2026-04-16T00:00:00.000Z'),
    updatedAt: new Date('2026-04-16T00:00:00.000Z'),
    lessons: Array.from({ length: lessonCount }, (_, index) => ({
      id: `lesson-${index + 1}`,
      trackId: 'track-1',
      subject: 'networking',
      lessonSlug: index === 0 ? 'protocol-stack' : 'http-lifecycle',
      title: index === 0 ? 'Protocol Stack' : 'HTTP Lifecycle',
      description: 'desc',
      order: index + 1,
      estimatedMinutes: 12,
      objectives: ['obj'],
      keywords: ['network'],
      chatContextSummary: 'summary',
      relatedLessonSlugs: [],
      animation: index === 0 ? 'protocol-stack' : 'http-lifecycle',
      heroSummary: 'hero',
      sections: [{ title: 'A', paragraphs: ['B'] }],
      misconceptions: [{ myth: 'm', clarification: 'c' }],
      quiz: [{ question: 'q', options: ['a', 'b'], answerIndex: 0, explanation: 'because' }],
      quickPrompts: ['Explain simply'],
      status: 'draft',
      createdAt: new Date('2026-04-16T00:00:00.000Z'),
      updatedAt: new Date('2026-04-16T00:00:00.000Z'),
    })),
  };
}

test('coerceContinuationCount defaults to 2 and clamps to the 1..3 range', () => {
  assert.equal(coerceContinuationCount(undefined), 2);
  assert.equal(coerceContinuationCount(1), 1);
  assert.equal(coerceContinuationCount(9), 3);
});

test('buildContinuationBlueprint rejects tracks with zero lessons', () => {
  assert.throws(() => buildContinuationBlueprint(makeTrack(0)), /at least one lesson/i);
});

test('buildContinuationPlanItems appends orders and avoids slug collisions', () => {
  const items = buildContinuationPlanItems(makeTrack(2), [
    {
      lessonSlug: 'http-lifecycle',
      title: 'Cache Validation',
      description: 'desc',
      order: 1,
      estimatedMinutes: 15,
      objectives: ['obj'],
      keywords: ['http'],
      animation: 'http-lifecycle',
      heroSummary: 'hero',
      chatContextSummary: 'summary',
      quickPrompts: ['Give an example'],
    },
  ]);

  assert.equal(items[0]?.order, 3);
  assert.equal(items[0]?.lessonSlug, 'http-lifecycle-2');
});

test('buildFallbackContinuationRelatedLessonSlugs keeps only known slugs and otherwise uses neighbors', () => {
  assert.deepEqual(
    buildFallbackContinuationRelatedLessonSlugs(
      ['protocol-stack', 'http-lifecycle', 'tcp-flow'],
      'cache-validation',
      ['http-lifecycle', 'unknown'],
    ),
    ['http-lifecycle'],
  );

  assert.deepEqual(
    buildFallbackContinuationRelatedLessonSlugs(
      ['protocol-stack', 'http-lifecycle', 'cache-validation', 'tcp-flow'],
      'cache-validation',
      ['unknown'],
    ),
    ['http-lifecycle', 'tcp-flow'],
  );
});
