import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAdjacentLearningLessons,
  getAllLearningLessons,
  getLearningLesson,
  getLearningSubjectBySlug,
  getLearningSubjects,
} from './content';

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
  assert.equal(lesson?.subjectTitle, '计算机组成原理');
  assert.match(lesson?.plainText ?? '', /取指/);
});

test('getAllLearningLessons exposes AI / Agent lessons for search', () => {
  const lessons = getAllLearningLessons();
  const lesson = lessons.find((item) => item.lessonSlug === 'what-is-an-agent');

  assert.ok(lesson);
  assert.equal(lesson?.subjectTitle, 'AI / Agent 工程基础');
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
  assert.match(subjectMeta.conceptOverview?.title ?? '', /逆向/);
  assert.match(subjectMeta.conceptOverview?.summary ?? '', /静态分析|动态调试|合法边界/);
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
  assert.equal(lesson?.subjectTitle, '逆向专题');
  assert.match(lesson?.plainText ?? '', /PE|静态分析|动态调试|调用栈|函数/);
});
