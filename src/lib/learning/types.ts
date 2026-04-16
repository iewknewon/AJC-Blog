import type {
  LearningAnimationKind,
  LearningConceptOverview,
  LearningLesson,
  LearningLessonSection,
  LearningMisconception,
  LearningQuizQuestion,
  LearningSubject,
} from '../../data/learning/types';

export type LearningStageSlug =
  | 'getting-started'
  | 'fundamentals'
  | 'advanced'
  | 'special-topics'
  | 'practicum';

export type LearningTrackStatus = 'draft' | 'published';
export type LearningPageVariant = 'default' | 'timeline';

export type LearningTrackRow = {
  id: string;
  slug: string;
  title: string;
  short_title: string;
  description: string;
  stage_slug: LearningStageSlug;
  eyebrow: string;
  color_token: string;
  icon: string;
  page_variant: LearningPageVariant;
  learning_path_json: string;
  concept_overview_json: string | null;
  source_prompt: string | null;
  status: LearningTrackStatus;
  created_at: string;
  updated_at: string;
};

export type LearningTrackQueryRow = LearningTrackRow & {
  lessons_count?: unknown;
};

export type LearningLessonRow = {
  id: string;
  track_id: string;
  lesson_slug: string;
  title: string;
  description: string;
  order_index: number;
  estimated_minutes: number;
  objectives_json: string;
  keywords_json: string;
  chat_context_summary: string;
  related_lesson_slugs_json: string;
  animation_kind: LearningAnimationKind;
  hero_summary: string;
  sections_json: string;
  misconceptions_json: string;
  quiz_json: string;
  quick_prompts_json: string;
  status: LearningTrackStatus;
  created_at: string;
  updated_at: string;
};

export type ManagedLearningSubject = LearningSubject & {
  id: string;
  stageSlug: LearningStageSlug;
  status: LearningTrackStatus;
  sourcePrompt?: string;
  lessonsCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ManagedLearningLesson = LearningLesson & {
  id: string;
  trackId: string;
  status: LearningTrackStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type UpsertLearningTrackInput = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  stageSlug: LearningStageSlug;
  eyebrow?: string | null;
  colorToken?: string | null;
  icon?: string | null;
  pageVariant?: LearningPageVariant | null;
  learningPath: string[];
  conceptOverview?: LearningConceptOverview | null;
  sourcePrompt?: string | null;
  status: LearningTrackStatus;
};

export type NormalizedLearningTrackInput = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  stageSlug: LearningStageSlug;
  eyebrow: string;
  colorToken: string;
  icon: string;
  pageVariant: LearningPageVariant;
  learningPath: string[];
  conceptOverview: LearningConceptOverview | null;
  sourcePrompt: string | null;
  status: LearningTrackStatus;
};

export type UpsertLearningLessonInput = {
  trackId: string;
  lessonSlug: string;
  title: string;
  description: string;
  order: number;
  estimatedMinutes: number;
  objectives: string[];
  keywords: string[];
  chatContextSummary: string;
  relatedLessonSlugs: string[];
  animation: LearningAnimationKind;
  heroSummary: string;
  sections: LearningLessonSection[];
  misconceptions: LearningMisconception[];
  quiz: LearningQuizQuestion[];
  quickPrompts: string[];
  status: LearningTrackStatus;
};

export type NormalizedLearningLessonInput = {
  trackId: string;
  lessonSlug: string;
  title: string;
  description: string;
  order: number;
  estimatedMinutes: number;
  objectives: string[];
  keywords: string[];
  chatContextSummary: string;
  relatedLessonSlugs: string[];
  animation: LearningAnimationKind;
  heroSummary: string;
  sections: LearningLessonSection[];
  misconceptions: LearningMisconception[];
  quiz: LearningQuizQuestion[];
  quickPrompts: string[];
  status: LearningTrackStatus;
};
