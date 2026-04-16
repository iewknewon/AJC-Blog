import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createLearningLesson,
  createLearningTrack,
  mapLearningLessonRow,
  mapLearningTrackRow,
  serializeLearningJson,
} from './repository';
import type {
  LearningLessonRow,
  LearningTrackQueryRow,
} from './types';

test('serializeLearningJson returns deterministic JSON for arrays and objects', () => {
  assert.equal(serializeLearningJson(['a', 'b']), '["a","b"]');
  assert.equal(serializeLearningJson({ title: 'Overview' }), '{"title":"Overview"}');
});

test('mapLearningTrackRow parses JSON columns and metadata', () => {
  const track = mapLearningTrackRow({
    id: 'track-1',
    slug: 'token-security',
    title: 'Token Security',
    short_title: 'Token Security',
    description: 'Learn how auth state is carried safely.',
    stage_slug: 'special-topics',
    eyebrow: 'Learning Track',
    color_token: 'security',
    icon: 'TK',
    page_variant: 'default',
    learning_path_json: '["Spot risks","Understand primitives","Ship defenses"]',
    concept_overview_json: '{"title":"Overview","summary":"desc","pillars":["Identity"],"safetyNotes":["Defensive only"]}',
    source_prompt: 'Teach me token security',
    status: 'draft',
    created_at: '2026-04-16T00:00:00.000Z',
    updated_at: '2026-04-16T01:00:00.000Z',
    lessons_count: 4,
  } satisfies LearningTrackQueryRow);

  assert.equal(track.slug, 'token-security');
  assert.equal(track.stageSlug, 'special-topics');
  assert.equal(track.learningPath.length, 3);
  assert.equal(track.conceptOverview?.title, 'Overview');
  assert.equal(track.lessonsCount, 4);
});

test('mapLearningLessonRow parses JSON lesson fields', () => {
  const lesson = mapLearningLessonRow({
    id: 'lesson-1',
    track_id: 'track-1',
    lesson_slug: 'session-basics',
    title: 'Session Basics',
    description: 'desc',
    order_index: 2,
    estimated_minutes: 14,
    objectives_json: '["Explain cookies","Explain sessions","Compare with tokens"]',
    keywords_json: '["cookies","session","token"]',
    chat_context_summary: 'Stay focused on browser session fundamentals.',
    related_lesson_slugs_json: '["auth-overview"]',
    animation_kind: 'workflow-vs-agent',
    hero_summary: 'hero',
    sections_json: '[{"title":"A","paragraphs":["B"]}]',
    misconceptions_json: '[{"myth":"m","clarification":"c"}]',
    quiz_json: '[{"question":"q","options":["a","b","c"],"answerIndex":1,"explanation":"because"}]',
    quick_prompts_json: '["Explain it more simply"]',
    status: 'published',
    created_at: '2026-04-16T00:00:00.000Z',
    updated_at: '2026-04-16T01:00:00.000Z',
  } satisfies LearningLessonRow);

  assert.equal(lesson.lessonSlug, 'session-basics');
  assert.equal(lesson.objectives.length, 3);
  assert.equal(lesson.sections[0]?.title, 'A');
  assert.equal(lesson.quiz[0]?.answerIndex, 1);
});

test('createLearningTrack inserts a new learning track and returns the mapped result', async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const db = {
    async batch() {
      return [];
    },
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          calls.push({ sql, values });
          return {
            async run() {
              return { success: true };
            },
            async all() {
              if (/FROM learning_lessons/i.test(sql)) {
                return { results: [] };
              }

              return { results: [] };
            },
            async first() {
              if (/FROM learning_tracks/i.test(sql)) {
                return {
                  id: 'track-1',
                  slug: 'token-security',
                  title: 'Token Security',
                  short_title: 'Token Security',
                  description: 'Learn auth state.',
                  stage_slug: 'special-topics',
                  eyebrow: 'Learning Track',
                  color_token: 'security',
                  icon: 'TK',
                  page_variant: 'default',
                  learning_path_json: '["Spot risks","Understand primitives","Ship defenses"]',
                  concept_overview_json: null,
                  source_prompt: 'Teach me token security',
                  status: 'draft',
                  created_at: '2026-04-16T00:00:00.000Z',
                  updated_at: '2026-04-16T00:00:00.000Z',
                  lessons_count: 0,
                };
              }

              return null;
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  const created = await createLearningTrack(db, {
    slug: 'token-security',
    title: 'Token Security',
    shortTitle: 'Token Security',
    description: 'Learn auth state.',
    stageSlug: 'special-topics',
    eyebrow: 'Learning Track',
    colorToken: 'security',
    icon: 'TK',
    pageVariant: 'default',
    learningPath: ['Spot risks', 'Understand primitives', 'Ship defenses'],
    conceptOverview: null,
    sourcePrompt: 'Teach me token security',
    status: 'draft',
  });

  assert.equal(created?.slug, 'token-security');
  assert.ok(calls.some((call) => /INSERT INTO learning_tracks/i.test(call.sql)));
});

test('createLearningLesson inserts a new lesson and returns the mapped result', async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const db = {
    async batch() {
      return [];
    },
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          calls.push({ sql, values });
          return {
            async run() {
              return { success: true };
            },
            async first() {
              if (/FROM learning_lessons/i.test(sql)) {
                return {
                  id: 'lesson-1',
                  track_id: 'track-1',
                  lesson_slug: 'session-basics',
                  title: 'Session Basics',
                  description: 'desc',
                  order_index: 1,
                  estimated_minutes: 14,
                  objectives_json: '["Explain cookies","Explain sessions","Compare with tokens"]',
                  keywords_json: '["cookies","session","token"]',
                  chat_context_summary: 'Stay focused on browser session fundamentals.',
                  related_lesson_slugs_json: '[]',
                  animation_kind: 'workflow-vs-agent',
                  hero_summary: 'hero',
                  sections_json: '[{"title":"A","paragraphs":["B"]}]',
                  misconceptions_json: '[{"myth":"m","clarification":"c"}]',
                  quiz_json: '[{"question":"q","options":["a","b","c"],"answerIndex":1,"explanation":"because"}]',
                  quick_prompts_json: '["Explain it more simply"]',
                  status: 'draft',
                  created_at: '2026-04-16T00:00:00.000Z',
                  updated_at: '2026-04-16T00:00:00.000Z',
                };
              }

              return null;
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  const created = await createLearningLesson(db, {
    trackId: 'track-1',
    lessonSlug: 'session-basics',
    title: 'Session Basics',
    description: 'desc',
    order: 1,
    estimatedMinutes: 14,
    objectives: ['Explain cookies', 'Explain sessions', 'Compare with tokens'],
    keywords: ['cookies', 'session', 'token'],
    chatContextSummary: 'Stay focused on browser session fundamentals.',
    relatedLessonSlugs: [],
    animation: 'workflow-vs-agent',
    heroSummary: 'hero',
    sections: [{ title: 'A', paragraphs: ['B'] }],
    misconceptions: [{ myth: 'm', clarification: 'c' }],
    quiz: [{ question: 'q', options: ['a', 'b', 'c'], answerIndex: 1, explanation: 'because' }],
    quickPrompts: ['Explain it more simply'],
    status: 'draft',
  });

  assert.equal(created?.lessonSlug, 'session-basics');
  assert.ok(calls.some((call) => /INSERT INTO learning_lessons/i.test(call.sql)));
});
