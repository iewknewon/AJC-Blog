import { slugifyTitle } from '../ai/openai-compatible';
import type {
  LearningLessonOutlineItem,
  LearningTrackBlueprint,
} from '../ai/learning';
import type {
  LearningContinuationPlanItem,
  ManagedLearningSubject,
} from './types';

function buildFallbackConceptOverview(track: ManagedLearningSubject): LearningTrackBlueprint['conceptOverview'] {
  return {
    title: `${track.title} Overview`,
    summary: track.description,
    pillars: track.learningPath.slice(0, 3),
    safetyNotes: ['Learning-only continuation context.'],
  };
}

export function coerceContinuationCount(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 2;
  }

  return Math.max(1, Math.min(3, Math.round(parsed)));
}

export function buildContinuationBlueprint(track: ManagedLearningSubject): LearningTrackBlueprint {
  if (track.lessons.length === 0) {
    throw new Error('Learning continuation requires at least one lesson.');
  }

  return {
    slug: track.slug,
    title: track.title,
    shortTitle: track.shortTitle,
    description: track.description,
    stageSlug: track.stageSlug,
    eyebrow: track.eyebrow,
    colorToken: track.colorToken,
    icon: track.icon,
    pageVariant: track.pageVariant ?? 'default',
    learningPath: track.learningPath,
    conceptOverview: track.conceptOverview ?? buildFallbackConceptOverview(track),
    sourcePrompt: track.sourcePrompt ?? '',
  };
}

export function buildContinuationPlanItems(
  track: ManagedLearningSubject,
  lessons: LearningLessonOutlineItem[],
): LearningContinuationPlanItem[] {
  const usedSlugs = new Set(track.lessons.map((lesson) => lesson.lessonSlug));
  const startingOrder = track.lessons.reduce((max, lesson) => Math.max(max, lesson.order), 0) + 1;

  return lessons.map((lesson, index) => {
    const baseSlug = slugifyTitle(lesson.lessonSlug || lesson.title);
    let lessonSlug = baseSlug;
    let suffix = 2;

    while (usedSlugs.has(lessonSlug)) {
      lessonSlug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    usedSlugs.add(lessonSlug);

    return {
      ...lesson,
      order: startingOrder + index,
      lessonSlug,
    };
  });
}

export function buildFallbackContinuationRelatedLessonSlugs(
  allLessonSlugs: string[],
  lessonSlug: string,
  relatedLessonSlugs: string[],
) {
  const knownSlugs = new Set(allLessonSlugs);
  const filtered = relatedLessonSlugs.filter((slug) => slug !== lessonSlug && knownSlugs.has(slug));

  if (filtered.length > 0) {
    return filtered;
  }

  const currentIndex = allLessonSlugs.findIndex((slug) => slug === lessonSlug);

  return [
    currentIndex > 0 ? allLessonSlugs[currentIndex - 1] : null,
    currentIndex >= 0 && currentIndex < allLessonSlugs.length - 1 ? allLessonSlugs[currentIndex + 1] : null,
  ].filter((slug): slug is string => Boolean(slug));
}
