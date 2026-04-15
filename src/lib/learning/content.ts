import { learningCatalog } from '../../data/learning/catalog';
import type { LearningLesson, LearningSubject, LearningSubjectSlug } from '../../data/learning/types';

export type SearchableLearningLesson = LearningLesson & {
  subjectTitle: string;
  href: string;
  plainText: string;
};

export function getLearningSubjects() {
  return learningCatalog;
}

export function getLearningSubjectBySlug(slug: string) {
  return learningCatalog.find((subject) => subject.slug === slug) ?? null;
}

export function getSubjectLessons(subjectSlug: LearningSubjectSlug) {
  const subject = getLearningSubjectBySlug(subjectSlug);
  return subject ? [...subject.lessons].sort((left, right) => left.order - right.order) : [];
}

export function getLearningLesson(subjectSlug: string, lessonSlug: string) {
  const subject = getLearningSubjectBySlug(subjectSlug);

  if (!subject) {
    return null;
  }

  const lesson = subject.lessons.find((item) => item.lessonSlug === lessonSlug) ?? null;

  if (!lesson) {
    return null;
  }

  return {
    subject,
    lesson,
  };
}

export function getAllLearningLessons(): SearchableLearningLesson[] {
  return learningCatalog.flatMap((subject) => subject.lessons.map((lesson) => ({
    ...lesson,
    subjectTitle: subject.title,
    href: `/learn/${subject.slug}/${lesson.lessonSlug}`,
    plainText: [
      lesson.heroSummary,
      ...lesson.objectives,
      ...lesson.keywords,
      ...lesson.sections.flatMap((section) => [section.title, ...section.paragraphs]),
      ...lesson.misconceptions.flatMap((item) => [item.myth, item.clarification]),
      ...lesson.quiz.flatMap((item) => [item.question, ...item.options, item.explanation]),
    ].join(' '),
  })));
}

export function getAdjacentLearningLessons(subject: LearningSubject, lessonSlug: string) {
  const lessons = [...subject.lessons].sort((left, right) => left.order - right.order);
  const index = lessons.findIndex((lesson) => lesson.lessonSlug === lessonSlug);

  return {
    previous: index > 0 ? lessons[index - 1] : undefined,
    next: index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : undefined,
  };
}

export function getRelatedLearningLessons(subject: LearningSubject, lesson: LearningLesson) {
  return lesson.relatedLessonSlugs
    .map((slug) => subject.lessons.find((candidate) => candidate.lessonSlug === slug))
    .filter((item): item is LearningLesson => Boolean(item));
}
