import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAdjacentLearningLessons,
  getAllLearningLessons,
  getLearningLesson,
  getLearningStageGroups,
  getLearningSubjectBySlug,
  getLearningSubjects,
  getMergedAllLearningLessons,
  getMergedLearningLesson,
  getMergedLearningSubjectBySlug,
} from './content';

function createLearningCmsDb() {
  const trackRow = {
    id: 'track-1',
    slug: 'token-security',
    title: 'Token Security',
    short_title: 'Token Security',
    description: 'Learn authentication, sessions, and secret handling.',
    stage_slug: 'special-topics',
    eyebrow: 'Learning Track',
    color_token: 'security',
    icon: 'TK',
    page_variant: 'default',
    learning_path_json: '["Spot risks","Understand primitives","Ship safer auth"]',
    concept_overview_json: '{"title":"Token Security","summary":"A defensive engineering track.","pillars":["Identity","Sessions"],"safetyNotes":["Defensive only"]}',
    source_prompt: 'Teach me token security',
    status: 'published',
    created_at: '2026-04-16T00:00:00.000Z',
    updated_at: '2026-04-16T00:00:00.000Z',
    lessons_count: 1,
  };

  const lessonRow = {
    id: 'lesson-1',
    track_id: 'track-1',
    lesson_slug: 'session-basics',
    title: 'Session Basics',
    description: 'Understand browser session state.',
    order_index: 1,
    estimated_minutes: 14,
    objectives_json: '["Explain cookies","Explain sessions","Compare with tokens"]',
    keywords_json: '["cookies","session","token"]',
    chat_context_summary: 'Keep the answer tied to cookie and session fundamentals.',
    related_lesson_slugs_json: '[]',
    animation_kind: 'workflow-vs-agent',
    hero_summary: 'A crisp overview of browser session state.',
    sections_json: '[{"title":"From request to identity","paragraphs":["The browser sends state back to the server so the app can remember who you are."]}]',
    misconceptions_json: '[{"myth":"A cookie is the session","clarification":"A cookie stores data; the session usually lives on the server."}]',
    quiz_json: '[{"question":"Where is a session usually stored?","options":["Only in the URL","Only in HTML","Typically on the server side"],"answerIndex":2,"explanation":"The browser usually keeps a session identifier."}]',
    quick_prompts_json: '["Explain it more simply"]',
    status: 'published',
    created_at: '2026-04-16T00:00:00.000Z',
    updated_at: '2026-04-16T00:00:00.000Z',
  };

  return {
    async batch() {
      return [];
    },
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async run() {
              return { success: true };
            },
            async all() {
              if (/FROM learning_tracks/i.test(sql)) {
                return { results: [trackRow] };
              }

              if (/FROM learning_lessons/i.test(sql)) {
                return { results: [lessonRow] };
              }

              return { results: [] };
            },
            async first() {
              if (/FROM learning_tracks/i.test(sql)) {
                const key = values[0];

                if (typeof key === 'string' && key !== 'track-1' && key !== 'token-security') {
                  return null;
                }

                return trackRow;
              }

              if (/FROM learning_lessons/i.test(sql)) {
                const lessonSlug = values[1];

                if (typeof lessonSlug === 'string' && lessonSlug !== 'session-basics') {
                  return null;
                }

                return lessonRow;
              }

              return null;
            },
          };
        },
      };
    },
  } as unknown as D1Database;
}

test('getLearningSubjects returns the built-in learning catalog', () => {
  const subjects = getLearningSubjects();

  assert.equal(subjects.length, 4);
  assert.deepEqual(subjects.map((subject) => subject.slug), [
    'networking',
    'computer-organization',
    'ai-agent-engineering',
    'reverse-engineering',
  ]);
});

test('getLearningLesson resolves lesson and subject by slug', () => {
  const resolved = getLearningLesson('networking', 'tcp-reliability');

  assert.ok(resolved);
  assert.equal(resolved?.subject.slug, 'networking');
  assert.equal(resolved?.lesson.lessonSlug, 'tcp-reliability');
});

test('getAdjacentLearningLessons returns previous and next lessons', () => {
  const subject = getLearningSubjectBySlug('networking');

  assert.ok(subject);

  const adjacent = getAdjacentLearningLessons(subject, 'http-request-lifecycle');
  assert.equal(adjacent.previous?.lessonSlug, 'protocol-stack');
  assert.equal(adjacent.next?.lessonSlug, 'tcp-reliability');
});

test('getAllLearningLessons exposes searchable lesson metadata', () => {
  const lessons = getAllLearningLessons();
  const lesson = lessons.find((item) => item.lessonSlug === 'instruction-cycle');

  assert.ok(lesson);
  assert.ok((lesson?.subjectTitle ?? '').length > 0);
  assert.ok((lesson?.plainText ?? '').length > 0);
});

test('getAllLearningLessons exposes AI / Agent lessons for search', () => {
  const lessons = getAllLearningLessons();
  const lesson = lessons.find((item) => item.lessonSlug === 'what-is-an-agent');

  assert.ok(lesson);
  assert.match(lesson?.plainText ?? '', /MCP|Tool|Agent|Workflow/);
});

test('reverse-engineering subject exposes timeline metadata and six lessons', () => {
  const subject = getLearningSubjectBySlug('reverse-engineering');

  assert.ok(subject);
  assert.equal(subject.lessons.length, 6);

  const subjectMeta = subject as typeof subject & {
    pageVariant?: string;
    conceptOverview?: { title?: string; summary?: string };
  };

  assert.equal(subjectMeta.pageVariant, 'timeline');
  assert.ok((subjectMeta.conceptOverview?.title ?? '').length > 0);
  assert.ok((subjectMeta.conceptOverview?.summary ?? '').length > 0);
});

test('getLearningLesson resolves reverse-engineering lessons by slug', () => {
  const resolved = getLearningLesson('reverse-engineering', 'program-binary-pe');

  assert.ok(resolved);
  assert.equal(resolved?.subject.slug, 'reverse-engineering');
  assert.equal(resolved?.lesson.lessonSlug, 'program-binary-pe');
});

test('getAllLearningLessons includes reverse-engineering content for search', () => {
  const lessons = getAllLearningLessons();
  const lesson = lessons.find((item) => item.lessonSlug === 'reverse-case-study');

  assert.ok(lesson);
  assert.match(lesson?.plainText ?? '', /PE|stack|debug/i);
});

test('getLearningStageGroups merges static and managed subjects under fixed stages', async () => {
  const groups = await getLearningStageGroups(createLearningCmsDb());

  assert.deepEqual(groups.map((group) => group.slug), [
    'getting-started',
    'fundamentals',
    'advanced',
    'special-topics',
    'practicum',
  ]);
  assert.ok(groups.find((group) => group.slug === 'special-topics')?.subjects.some((subject) => subject.slug === 'token-security'));
});

test('getMergedLearningSubjectBySlug prefers managed subjects over the static catalog', async () => {
  const subject = await getMergedLearningSubjectBySlug('token-security', createLearningCmsDb());

  assert.ok(subject);
  assert.equal(subject?.slug, 'token-security');
  assert.equal(subject?.title, 'Token Security');
});

test('getMergedLearningLesson resolves a managed lesson by subject and lesson slug', async () => {
  const resolved = await getMergedLearningLesson('token-security', 'session-basics', createLearningCmsDb());

  assert.ok(resolved);
  assert.equal(resolved?.subject.slug, 'token-security');
  assert.equal(resolved?.lesson.lessonSlug, 'session-basics');
});

test('getMergedAllLearningLessons includes managed lessons in the search index', async () => {
  const lessons = await getMergedAllLearningLessons(createLearningCmsDb());
  const lesson = lessons.find((item) => item.href === '/learn/token-security/session-basics');

  assert.ok(lesson);
  assert.equal(lesson?.subjectTitle, 'Token Security');
  assert.match(lesson?.plainText ?? '', /cookies|session|token/i);
});
