import test from 'node:test';
import assert from 'node:assert/strict';

import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from '../auth/session';
import { POST as postDrafts } from '../../pages/api/admin/learning/[id]/continuation-drafts';
import { POST as postPlan } from '../../pages/api/admin/learning/[id]/continuation-plan';

function createCookieStore(value?: string) {
  return {
    get(name: string) {
      if (name !== ADMIN_SESSION_COOKIE || !value) {
        return undefined;
      }

      return { value };
    },
  };
}

function createPlanDbMock(lessonCount = 2) {
  const writes: Array<{ sql: string; values: unknown[] }> = [];

  const db = {
    async batch() {
      return [];
    },
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async first() {
              if (/FROM learning_tracks/i.test(sql)) {
                return {
                  id: 'track-1',
                  slug: 'networking',
                  title: 'Networking',
                  short_title: 'Network',
                  description: 'desc',
                  stage_slug: 'fundamentals',
                  eyebrow: 'Learning Track',
                  color_token: 'learning',
                  icon: 'NW',
                  page_variant: 'default',
                  learning_path_json: '["Layers","Requests","Transport"]',
                  concept_overview_json: '{"title":"Overview","summary":"desc","pillars":["Layers"],"safetyNotes":["Learning only"]}',
                  source_prompt: 'teach networking',
                  status: 'draft',
                  created_at: '2026-04-16T00:00:00.000Z',
                  updated_at: '2026-04-16T00:00:00.000Z',
                  lessons_count: lessonCount,
                };
              }

              return null;
            },
            async all() {
              if (/FROM learning_lessons/i.test(sql) && lessonCount > 0) {
                return {
                  results: Array.from({ length: lessonCount }, (_, index) => ({
                    id: `lesson-${index + 1}`,
                    track_id: String(values[0] ?? 'track-1'),
                    lesson_slug: index === 0 ? 'protocol-stack' : 'http-lifecycle',
                    title: index === 0 ? 'Protocol Stack' : 'HTTP Lifecycle',
                    description: 'desc',
                    order_index: index + 1,
                    estimated_minutes: 12,
                    objectives_json: '["obj"]',
                    keywords_json: index === 0 ? '["network"]' : '["http"]',
                    chat_context_summary: 'summary',
                    related_lesson_slugs_json: '[]',
                    animation_kind: index === 0 ? 'protocol-stack' : 'http-lifecycle',
                    hero_summary: 'hero',
                    sections_json: '[{"title":"A","paragraphs":["B"]}]',
                    misconceptions_json: '[{"myth":"m","clarification":"c"}]',
                    quiz_json: '[{"question":"q","options":["a","b"],"answerIndex":0,"explanation":"because"}]',
                    quick_prompts_json: '["Explain simply"]',
                    status: 'draft',
                    created_at: '2026-04-16T00:00:00.000Z',
                    updated_at: '2026-04-16T00:00:00.000Z',
                  })),
                };
              }

              return { results: [] };
            },
            async run() {
              writes.push({ sql, values });
              return { success: true };
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  return { db, writes };
}

async function createPlanContext({
  lessonCount = 2,
  includeAuth = true,
}: {
  lessonCount?: number;
  includeAuth?: boolean;
} = {}) {
  const token = includeAuth ? await createAdminSessionToken('super-secret') : undefined;
  const { db, writes } = createPlanDbMock(lessonCount);

  return {
    context: {
      params: { id: 'track-1' },
      request: new Request('https://example.com/api/admin/learning/track-1/continuation-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          direction: 'Continue with cache validation and CDN cooperation.',
          count: 5,
          baseUrl: 'https://api.example.com/v1',
          apiKey: 'key',
          model: 'gpt-test',
        }),
      }),
      cookies: createCookieStore(token),
      locals: {
        runtime: {
          env: {
            DB: db,
            SESSION_SECRET: 'super-secret',
          },
        },
      },
    },
    writes,
  };
}

test('POST /api/admin/learning/:id/continuation-plan requires admin auth', async () => {
  const { context } = await createPlanContext({ includeAuth: false });

  const response = await postPlan(context);
  assert.equal(response.status, 401);
});

test('POST /api/admin/learning/:id/continuation-plan rejects tracks with zero lessons', async () => {
  const { context } = await createPlanContext({ lessonCount: 0 });

  const response = await postPlan(context);
  assert.equal(response.status, 409);
});

test('POST /api/admin/learning/:id/continuation-plan clamps count and returns append-only plan cards', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    choices: [
      {
        message: {
          content: JSON.stringify({
            lessons: [
              {
                lessonSlug: 'cache-validation',
                title: 'Cache Validation',
                description: 'desc',
                order: 1,
                estimatedMinutes: 15,
                objectives: ['Understand ETag'],
                keywords: ['http', 'etag'],
                animation: 'http-lifecycle',
                heroSummary: 'hero',
                chatContextSummary: 'summary',
                quickPrompts: ['Give an example'],
              },
              {
                lessonSlug: 'cdn-proxy',
                title: 'CDN And Proxy',
                description: 'desc',
                order: 2,
                estimatedMinutes: 14,
                objectives: ['Understand CDN'],
                keywords: ['cdn'],
                animation: 'http-lifecycle',
                heroSummary: 'hero',
                chatContextSummary: 'summary',
                quickPrompts: ['Explain simply'],
              },
              {
                lessonSlug: 'origin-protection',
                title: 'Origin Protection',
                description: 'desc',
                order: 3,
                estimatedMinutes: 16,
                objectives: ['Understand origin'],
                keywords: ['origin'],
                animation: 'http-lifecycle',
                heroSummary: 'hero',
                chatContextSummary: 'summary',
                quickPrompts: ['Show the flow'],
              },
            ],
          }),
        },
      },
    ],
  }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });

  try {
    const { context, writes } = await createPlanContext({ lessonCount: 2 });
    const response = await postPlan(context);
    const payload = await response.json() as {
      track: { id: string; slug: string; title: string };
      direction: string;
      startingOrder: number;
      plans: Array<{ order: number; lessonSlug: string }>;
    };

    assert.equal(response.status, 200);
    assert.equal(payload.track.id, 'track-1');
    assert.equal(payload.track.slug, 'networking');
    assert.equal(payload.direction, 'Continue with cache validation and CDN cooperation.');
    assert.equal(payload.startingOrder, 3);
    assert.equal(payload.plans.length, 3);
    assert.equal(payload.plans[0]?.order, 3);
    assert.equal(payload.plans[0]?.lessonSlug, 'cache-validation');
    assert.equal(writes.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function createDraftDbMock() {
  const writes: Array<{ sql: string; values: unknown[] }> = [];
  const insertedLessons = new Map<string, Record<string, unknown>>();
  const existingLessons = [
    {
      id: 'lesson-1',
      track_id: 'track-1',
      lesson_slug: 'protocol-stack',
      title: 'Protocol Stack',
      description: 'desc',
      order_index: 1,
      estimated_minutes: 12,
      objectives_json: '["obj"]',
      keywords_json: '["network"]',
      chat_context_summary: 'summary',
      related_lesson_slugs_json: '[]',
      animation_kind: 'protocol-stack',
      hero_summary: 'hero',
      sections_json: '[{"title":"A","paragraphs":["B"]}]',
      misconceptions_json: '[{"myth":"m","clarification":"c"}]',
      quiz_json: '[{"question":"q","options":["a","b"],"answerIndex":0,"explanation":"because"}]',
      quick_prompts_json: '["Explain simply"]',
      status: 'draft',
      created_at: '2026-04-16T00:00:00.000Z',
      updated_at: '2026-04-16T00:00:00.000Z',
    },
    {
      id: 'lesson-2',
      track_id: 'track-1',
      lesson_slug: 'http-lifecycle',
      title: 'HTTP Lifecycle',
      description: 'desc',
      order_index: 2,
      estimated_minutes: 12,
      objectives_json: '["obj"]',
      keywords_json: '["http"]',
      chat_context_summary: 'summary',
      related_lesson_slugs_json: '[]',
      animation_kind: 'http-lifecycle',
      hero_summary: 'hero',
      sections_json: '[{"title":"A","paragraphs":["B"]}]',
      misconceptions_json: '[{"myth":"m","clarification":"c"}]',
      quiz_json: '[{"question":"q","options":["a","b"],"answerIndex":0,"explanation":"because"}]',
      quick_prompts_json: '["Explain simply"]',
      status: 'draft',
      created_at: '2026-04-16T00:00:00.000Z',
      updated_at: '2026-04-16T00:00:00.000Z',
    },
  ];

  const db = {
    async batch() {
      return [];
    },
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async first() {
              if (/FROM learning_tracks/i.test(sql)) {
                return {
                  id: 'track-1',
                  slug: 'networking',
                  title: 'Networking',
                  short_title: 'Network',
                  description: 'desc',
                  stage_slug: 'fundamentals',
                  eyebrow: 'Learning Track',
                  color_token: 'learning',
                  icon: 'NW',
                  page_variant: 'default',
                  learning_path_json: '["Layers","Requests","Transport"]',
                  concept_overview_json: '{"title":"Overview","summary":"desc","pillars":["Layers"],"safetyNotes":["Learning only"]}',
                  source_prompt: 'teach networking',
                  status: 'draft',
                  created_at: '2026-04-16T00:00:00.000Z',
                  updated_at: '2026-04-16T00:00:00.000Z',
                  lessons_count: 2,
                };
              }

              if (/FROM learning_lessons/i.test(sql)) {
                return insertedLessons.get(String(values[0])) ?? null;
              }

              return null;
            },
            async all() {
              if (/FROM learning_lessons/i.test(sql)) {
                return { results: existingLessons };
              }

              return { results: [] };
            },
            async run() {
              writes.push({ sql, values });

              if (/INSERT INTO learning_lessons/i.test(sql)) {
                const [
                  id,
                  trackId,
                  lessonSlug,
                  title,
                  description,
                  order,
                  estimatedMinutes,
                  objectivesJson,
                  keywordsJson,
                  chatContextSummary,
                  relatedLessonSlugsJson,
                  animation,
                  heroSummary,
                  sectionsJson,
                  misconceptionsJson,
                  quizJson,
                  quickPromptsJson,
                  status,
                  createdAt,
                  updatedAt,
                ] = values;

                insertedLessons.set(String(id), {
                  id,
                  track_id: trackId,
                  lesson_slug: lessonSlug,
                  title,
                  description,
                  order_index: order,
                  estimated_minutes: estimatedMinutes,
                  objectives_json: objectivesJson,
                  keywords_json: keywordsJson,
                  chat_context_summary: chatContextSummary,
                  related_lesson_slugs_json: relatedLessonSlugsJson,
                  animation_kind: animation,
                  hero_summary: heroSummary,
                  sections_json: sectionsJson,
                  misconceptions_json: misconceptionsJson,
                  quiz_json: quizJson,
                  quick_prompts_json: quickPromptsJson,
                  status,
                  created_at: createdAt,
                  updated_at: updatedAt,
                });
              }

              return { success: true };
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  return { db, writes };
}

async function createDraftContext() {
  const token = await createAdminSessionToken('super-secret');
  const { db, writes } = createDraftDbMock();

  return {
    context: {
      params: { id: 'track-1' },
      request: new Request('https://example.com/api/admin/learning/track-1/continuation-drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          direction: 'Continue with cache validation and CDN cooperation.',
          baseUrl: 'https://api.example.com/v1',
          apiKey: 'key',
          model: 'gpt-test',
          plans: [
            {
              order: 3,
              lessonSlug: 'cache-validation',
              title: 'Cache Validation',
              description: 'desc',
              estimatedMinutes: 15,
              objectives: ['Understand ETag'],
              keywords: ['http', 'etag'],
              animation: 'http-lifecycle',
              heroSummary: 'hero',
              chatContextSummary: 'summary',
              quickPrompts: ['Give an example'],
            },
            {
              order: 4,
              lessonSlug: 'cdn-proxy',
              title: 'CDN And Proxy',
              description: 'desc',
              estimatedMinutes: 14,
              objectives: ['Understand CDN'],
              keywords: ['cdn'],
              animation: 'http-lifecycle',
              heroSummary: 'hero',
              chatContextSummary: 'summary',
              quickPrompts: ['Explain simply'],
            },
          ],
        }),
      }),
      cookies: createCookieStore(token),
      locals: {
        runtime: {
          env: {
            DB: db,
            SESSION_SECRET: 'super-secret',
          },
        },
      },
    },
    writes,
  };
}

test('POST /api/admin/learning/:id/continuation-drafts stores successful drafts and keeps failures in the response', async () => {
  const originalFetch = globalThis.fetch;
  let callIndex = 0;
  globalThis.fetch = async () => {
    callIndex += 1;

    if (callIndex === 1) {
      return new Response(JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                sections: [{ title: 'Cache Validation', paragraphs: ['Paragraph 1', 'Paragraph 2'] }],
                misconceptions: [{ myth: 'Cache always hits', clarification: 'Cache can miss or expire.' }],
                quiz: [{ question: 'q', options: ['a', 'b'], answerIndex: 0, explanation: 'because' }],
                relatedLessonSlugs: ['http-lifecycle'],
              }),
            },
          },
        ],
      }), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    }

    return new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: 'not-json',
          },
        },
      ],
    }), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  };

  try {
    const { context, writes } = await createDraftContext();
    const response = await postDrafts(context);
    const payload = await response.json() as {
      created: Array<{ adminUrl: string }>;
      failed: Array<{ title: string }>;
    };

    assert.equal(response.status, 200);
    assert.equal(payload.created.length, 1);
    assert.equal(payload.failed.length, 1);
    assert.match(payload.created[0]?.adminUrl ?? '', /\/admin\/learning\/track-1\/lessons\//);
    assert.equal(writes.filter((entry) => /INSERT INTO learning_lessons/i.test(entry.sql)).length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
