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

  assert.equal(subjects.length, 3);
  assert.deepEqual(subjects.map((subject) => subject.slug), ['networking', 'computer-organization', 'ai-agent-engineering']);
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

  const adjacent = getAdjacentLearningLessons(subject!, 'http-request-lifecycle');
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
