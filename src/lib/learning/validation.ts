import type {
  LearningPageVariant,
  LearningStageSlug,
  LearningTrackStatus,
  UpsertLearningLessonInput,
  UpsertLearningTrackInput,
} from './types';

type InputValue = FormDataEntryValue | string | number | string[] | undefined | null;
type ArrayInput = unknown[] | string | undefined | null;

type ValidationFailure<T> = {
  success: false;
  message: string;
  fieldErrors: Partial<Record<keyof T, string>>;
};

type ValidationSuccess<T> = {
  success: true;
  data: T;
};

export type LearningTrackValidationResult =
  | ValidationFailure<UpsertLearningTrackInput>
  | ValidationSuccess<UpsertLearningTrackInput>;

export type LearningLessonValidationResult =
  | ValidationFailure<UpsertLearningLessonInput>
  | ValidationSuccess<UpsertLearningLessonInput>;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STAGE_SLUGS: LearningStageSlug[] = [
  'getting-started',
  'fundamentals',
  'advanced',
  'special-topics',
  'practicum',
];

function toText(value: InputValue) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return typeof value === 'string' ? value : value?.toString() ?? '';
}

function normalizeStatus(value: string): LearningTrackStatus {
  return value === 'published' ? 'published' : 'draft';
}

function normalizeStageSlug(value: string): LearningStageSlug {
  return STAGE_SLUGS.includes(value as LearningStageSlug) ? value as LearningStageSlug : 'special-topics';
}

function normalizePageVariant(value: string): LearningPageVariant {
  return value === 'timeline' ? 'timeline' : 'default';
}

function parseStringArray(value: ArrayInput) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? '').trim())
      .filter(Boolean);
  }

  const text = String(value ?? '').trim();

  if (!text) {
    return [] as string[];
  }

  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed)
        ? parsed.map((item) => String(item ?? '').trim()).filter(Boolean)
        : [];
    } catch {
      return [];
    }
  }

  return text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseConceptOverview(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return parseConceptOverview(JSON.parse(value));
    } catch {
      return null;
    }
  }

  if (typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const title = String(record.title ?? '').trim();
  const summary = String(record.summary ?? '').trim();
  const pillars = parseStringArray(record.pillars as ArrayInput);
  const safetyNotes = parseStringArray(record.safetyNotes as ArrayInput);

  if (!title || !summary || pillars.length === 0 || safetyNotes.length === 0) {
    return null;
  }

  return {
    title,
    summary,
    pillars,
    safetyNotes,
  };
}

function normalizeSectionArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const title = String(record.title ?? '').trim();
      const paragraphs = parseStringArray(record.paragraphs as ArrayInput);

      if (!title || paragraphs.length === 0) {
        return null;
      }

      return { title, paragraphs };
    })
    .filter((item): item is { title: string; paragraphs: string[] } => Boolean(item));
}

function normalizeMisconceptionArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const myth = String(record.myth ?? '').trim();
      const clarification = String(record.clarification ?? '').trim();

      if (!myth || !clarification) {
        return null;
      }

      return { myth, clarification };
    })
    .filter((item): item is { myth: string; clarification: string } => Boolean(item));
}

function normalizeQuizArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const question = String(record.question ?? '').trim();
      const options = parseStringArray(record.options as ArrayInput);
      const explanation = String(record.explanation ?? '').trim();
      const answerIndex = Number(record.answerIndex);

      if (!question || options.length < 2 || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length || !explanation) {
        return null;
      }

      return { question, options, answerIndex, explanation };
    })
    .filter((item): item is { question: string; options: string[]; answerIndex: number; explanation: string } => Boolean(item));
}

export function validateLearningTrackInput(input: {
  slug: InputValue;
  title: InputValue;
  shortTitle: InputValue;
  description: InputValue;
  stageSlug: InputValue;
  eyebrow?: InputValue;
  colorToken?: InputValue;
  icon?: InputValue;
  pageVariant?: InputValue;
  learningPath?: ArrayInput;
  conceptOverview?: unknown;
  sourcePrompt?: InputValue;
  status?: InputValue;
}): LearningTrackValidationResult {
  const slug = toText(input.slug).trim();
  const title = toText(input.title).trim();
  const shortTitle = toText(input.shortTitle).trim();
  const description = toText(input.description).trim();
  const stageSlug = normalizeStageSlug(toText(input.stageSlug).trim());
  const eyebrow = toText(input.eyebrow).trim() || 'Learning Track';
  const colorToken = toText(input.colorToken).trim() || 'learning';
  const icon = toText(input.icon).trim() || 'LR';
  const pageVariant = normalizePageVariant(toText(input.pageVariant).trim());
  const learningPath = parseStringArray(input.learningPath);
  const conceptOverview = parseConceptOverview(input.conceptOverview);
  const sourcePrompt = toText(input.sourcePrompt).trim() || null;
  const status = normalizeStatus(toText(input.status).trim());
  const fieldErrors: ValidationFailure<UpsertLearningTrackInput>['fieldErrors'] = {};

  if (!SLUG_PATTERN.test(slug)) {
    fieldErrors.slug = 'Use lowercase kebab-case for the track slug.';
  }

  if (!title) {
    fieldErrors.title = 'Title is required.';
  }

  if (!shortTitle) {
    fieldErrors.shortTitle = 'Short title is required.';
  }

  if (!description) {
    fieldErrors.description = 'Description is required.';
  }

  if (learningPath.length === 0) {
    fieldErrors.learningPath = 'Add at least one learning path step.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: 'Learning track validation failed.',
      fieldErrors,
    };
  }

  return {
    success: true,
    data: {
      slug,
      title,
      shortTitle,
      description,
      stageSlug,
      eyebrow,
      colorToken,
      icon,
      pageVariant,
      learningPath,
      conceptOverview,
      sourcePrompt,
      status,
    },
  };
}

export function validateLearningLessonInput(input: {
  trackId?: InputValue;
  lessonSlug: InputValue;
  title: InputValue;
  description: InputValue;
  order: InputValue;
  estimatedMinutes: InputValue;
  objectives?: ArrayInput;
  keywords?: ArrayInput;
  chatContextSummary: InputValue;
  relatedLessonSlugs?: ArrayInput;
  animation: InputValue;
  heroSummary: InputValue;
  sections?: unknown;
  misconceptions?: unknown;
  quiz?: unknown;
  quickPrompts?: ArrayInput;
  status?: InputValue;
}): LearningLessonValidationResult {
  const trackId = toText(input.trackId).trim();
  const lessonSlug = toText(input.lessonSlug).trim();
  const title = toText(input.title).trim();
  const description = toText(input.description).trim();
  const order = Number(input.order);
  const estimatedMinutes = Number(input.estimatedMinutes);
  const objectives = parseStringArray(input.objectives);
  const keywords = parseStringArray(input.keywords);
  const chatContextSummary = toText(input.chatContextSummary).trim();
  const relatedLessonSlugs = parseStringArray(input.relatedLessonSlugs);
  const animation = toText(input.animation).trim();
  const heroSummary = toText(input.heroSummary).trim();
  const sections = normalizeSectionArray(input.sections);
  const misconceptions = normalizeMisconceptionArray(input.misconceptions);
  const quiz = normalizeQuizArray(input.quiz);
  const quickPrompts = parseStringArray(input.quickPrompts);
  const status = normalizeStatus(toText(input.status).trim());
  const fieldErrors: ValidationFailure<UpsertLearningLessonInput>['fieldErrors'] = {};

  if (input.trackId !== undefined && !trackId) {
    fieldErrors.trackId = 'Track id is required.';
  }

  if (!SLUG_PATTERN.test(lessonSlug)) {
    fieldErrors.lessonSlug = 'Use lowercase kebab-case for the lesson slug.';
  }

  if (!title) {
    fieldErrors.title = 'Title is required.';
  }

  if (!description) {
    fieldErrors.description = 'Description is required.';
  }

  if (!Number.isInteger(order) || order <= 0) {
    fieldErrors.order = 'Order must be a positive integer.';
  }

  if (!Number.isFinite(estimatedMinutes) || estimatedMinutes <= 0) {
    fieldErrors.estimatedMinutes = 'Estimated minutes must be greater than zero.';
  }

  if (objectives.length === 0) {
    fieldErrors.objectives = 'Add at least one objective.';
  }

  if (!chatContextSummary) {
    fieldErrors.chatContextSummary = 'Chat context summary is required.';
  }

  if (!animation) {
    fieldErrors.animation = 'Animation kind is required.';
  }

  if (!heroSummary) {
    fieldErrors.heroSummary = 'Hero summary is required.';
  }

  if (sections.length === 0) {
    fieldErrors.sections = 'Add at least one section.';
  }

  if (quiz.length === 0) {
    fieldErrors.quiz = 'Add at least one quiz question.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: 'Learning lesson validation failed.',
      fieldErrors,
    };
  }

  return {
    success: true,
    data: {
      trackId,
      lessonSlug,
      title,
      description,
      order,
      estimatedMinutes,
      objectives,
      keywords,
      chatContextSummary,
      relatedLessonSlugs,
      animation: animation as UpsertLearningLessonInput['animation'],
      heroSummary,
      sections,
      misconceptions,
      quiz,
      quickPrompts,
      status,
    },
  };
}
