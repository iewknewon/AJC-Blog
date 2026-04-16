import test from 'node:test';
import assert from 'node:assert/strict';

import { validateLearningLessonInput, validateLearningTrackInput } from './validation';

test('validateLearningTrackInput normalizes a valid draft track', () => {
  const result = validateLearningTrackInput({
    slug: 'token-security',
    title: 'Token Security Track',
    shortTitle: 'Token Security',
    description: 'Learn authentication, session design, and token hygiene.',
    stageSlug: 'special-topics',
    status: 'draft',
    learningPath: ['Spot the risks', 'Understand the primitives', 'Ship safer auth'],
    conceptOverview: {
      title: 'What token security really means',
      summary: 'A practical overview of identity, session, and secret handling.',
      pillars: ['Identity', 'Trust', 'Storage'],
      safetyNotes: ['Focus on defensive engineering only.'],
    },
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.slug, 'token-security');
    assert.equal(result.data.stageSlug, 'special-topics');
    assert.equal(result.data.learningPath.length, 3);
    assert.equal(result.data.eyebrow, 'Learning Track');
  }
});

test('validateLearningTrackInput rejects invalid slug and missing title', () => {
  const result = validateLearningTrackInput({
    slug: 'Token Security',
    title: '',
    shortTitle: '',
    description: 'desc',
    stageSlug: 'special-topics',
    status: 'draft',
    learningPath: [],
  });

  assert.equal(result.success, false);

  if (!result.success) {
    assert.ok(result.fieldErrors.slug);
    assert.ok(result.fieldErrors.title);
    assert.ok(result.fieldErrors.shortTitle);
    assert.ok(result.fieldErrors.learningPath);
  }
});

test('validateLearningLessonInput normalizes structured lesson content', () => {
  const result = validateLearningLessonInput({
    lessonSlug: 'session-basics',
    title: 'Session Basics',
    description: 'Understand how browser sessions stay tied to a user.',
    order: 2,
    estimatedMinutes: 14,
    objectives: ['Explain cookies', 'Explain sessions', 'Compare with tokens'],
    keywords: ['cookies', 'session', 'token'],
    chatContextSummary: 'Keep the explanation tied to cookie and session fundamentals.',
    relatedLessonSlugs: ['auth-overview'],
    animation: 'workflow-vs-agent',
    heroSummary: 'A crisp overview of browser session state.',
    sections: [
      {
        title: 'From request to identity',
        paragraphs: ['The browser sends state back to the server so the app can remember who you are.'],
      },
    ],
    misconceptions: [
      {
        myth: 'A cookie is the same thing as a session.',
        clarification: 'A cookie is a storage mechanism; a session is application-side state.',
      },
    ],
    quiz: [
      {
        question: 'Where is a session usually stored?',
        options: ['Only in the URL', 'Only in HTML', 'Typically on the server side', 'Only in JavaScript memory'],
        answerIndex: 2,
        explanation: 'The browser usually stores a session identifier, not the whole session object.',
      },
    ],
    quickPrompts: ['Explain it more simply'],
    status: 'draft',
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.lessonSlug, 'session-basics');
    assert.equal(result.data.objectives.length, 3);
    assert.equal(result.data.quiz[0]?.answerIndex, 2);
  }
});

test('validateLearningLessonInput rejects empty sections and malformed quiz', () => {
  const result = validateLearningLessonInput({
    lessonSlug: 'broken-lesson',
    title: 'Broken Lesson',
    description: '',
    order: 0,
    estimatedMinutes: 0,
    objectives: [],
    keywords: [],
    chatContextSummary: '',
    relatedLessonSlugs: [],
    animation: 'workflow-vs-agent',
    heroSummary: '',
    sections: [],
    misconceptions: [],
    quiz: [],
    quickPrompts: [],
    status: 'draft',
  });

  assert.equal(result.success, false);

  if (!result.success) {
    assert.ok(result.fieldErrors.description);
    assert.ok(result.fieldErrors.order);
    assert.ok(result.fieldErrors.estimatedMinutes);
    assert.ok(result.fieldErrors.objectives);
    assert.ok(result.fieldErrors.sections);
    assert.ok(result.fieldErrors.quiz);
  }
});
