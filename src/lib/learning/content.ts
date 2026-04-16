import { learningCatalog } from '../../data/learning/catalog';
import { getStaticLearningStageSlug, learningStages } from '../../data/learning/stages';
import type { LearningLesson, LearningSubject, LearningSubjectSlug } from '../../data/learning/types';
import type { LearningStageSlug, ManagedLearningSubject } from './types';
import { getPublishedLearningLessonByTrackSlug, getPublishedLearningTracks } from './repository';

export type SearchableLearningLesson = LearningLesson & {
  subjectTitle: string;
  href: string;
  plainText: string;
};

export type LearningStageGroup = {
  slug: LearningStageSlug;
  title: string;
  description: string;
  subjects: Array<LearningSubject | ManagedLearningSubject>;
  lessonCount: number;
};

function buildSearchableLesson(subject: Pick<LearningSubject, 'slug' | 'title'>, lesson: LearningLesson): SearchableLearningLesson {
  return {
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
  };
}

function sortLessons<T extends Pick<LearningLesson, 'order'>>(lessons: T[]) {
  return [...lessons].sort((left, right) => left.order - right.order);
}

function isManagedSubject(subject: LearningSubject | ManagedLearningSubject): subject is ManagedLearningSubject {
  return 'stageSlug' in subject;
}

function getSubjectStageSlug(subject: LearningSubject | ManagedLearningSubject) {
  return isManagedSubject(subject)
    ? subject.stageSlug
    : getStaticLearningStageSlug(subject.slug);
}

export function getLearningSubjects() {
  return learningCatalog;
}

export function getLearningSubjectBySlug(slug: string) {
  return learningCatalog.find((subject) => subject.slug === slug) ?? null;
}

export function getSubjectLessons(subjectSlug: LearningSubjectSlug) {
  const subject = getLearningSubjectBySlug(subjectSlug);
  return subject ? sortLessons(subject.lessons) : [];
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
  return learningCatalog.flatMap((subject) => subject.lessons.map((lesson) => buildSearchableLesson(subject, lesson)));
}

export function getAdjacentLearningLessons(subject: LearningSubject, lessonSlug: string) {
  const lessons = sortLessons(subject.lessons);
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

export async function getManagedLearningSubjects(db?: D1Database) {
  if (!db) {
    return [] as ManagedLearningSubject[];
  }

  return getPublishedLearningTracks(db);
}

export async function getMergedLearningSubjects(db?: D1Database) {
  const managedSubjects = await getManagedLearningSubjects(db);
  const subjectMap = new Map<string, LearningSubject | ManagedLearningSubject>();

  managedSubjects.forEach((subject) => {
    subjectMap.set(subject.slug, subject);
  });

  learningCatalog.forEach((subject) => {
    if (!subjectMap.has(subject.slug)) {
      subjectMap.set(subject.slug, subject);
    }
  });

  return Array.from(subjectMap.values());
}

export async function getMergedLearningSubjectBySlug(slug: string, db?: D1Database) {
  if (db) {
    const managedSubject = (await getPublishedLearningTracks(db)).find((subject) => subject.slug === slug) ?? null;

    if (managedSubject) {
      return managedSubject;
    }
  }

  return getLearningSubjectBySlug(slug);
}

export async function getMergedLearningLesson(subjectSlug: string, lessonSlug: string, db?: D1Database) {
  if (db) {
    const managedResolved = await getPublishedLearningLessonByTrackSlug(db, subjectSlug, lessonSlug);

    if (managedResolved) {
      return managedResolved;
    }
  }

  return getLearningLesson(subjectSlug, lessonSlug);
}

export async function getMergedAllLearningLessons(db?: D1Database) {
  const managedSubjects = await getManagedLearningSubjects(db);
  const managedLessons = managedSubjects.flatMap((subject) => subject.lessons.map((lesson) => buildSearchableLesson(subject, lesson)));

  return [...managedLessons, ...getAllLearningLessons()];
}

export async function getLearningStageGroups(db?: D1Database): Promise<LearningStageGroup[]> {
  const subjects = await getMergedLearningSubjects(db);

  return learningStages.map((stage) => {
    const stageSubjects = subjects.filter((subject) => getSubjectStageSlug(subject) === stage.slug);

    return {
      slug: stage.slug,
      title: stage.title,
      description: stage.description,
      subjects: stageSubjects,
      lessonCount: stageSubjects.reduce((total, subject) => total + subject.lessons.length, 0),
    };
  });
}
