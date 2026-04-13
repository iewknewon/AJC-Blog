import type { NovelProjectStatus, UpsertNovelProjectInput } from './types';

type InputValue = FormDataEntryValue | string | undefined | null;

type ValidationFailure = {
  success: false;
  message: string;
  fieldErrors: Partial<Record<keyof UpsertNovelProjectInput, string>>;
};

type ValidationSuccess = {
  success: true;
  data: UpsertNovelProjectInput;
};

export type NovelValidationResult = ValidationSuccess | ValidationFailure;

export type NovelProjectFormInput = {
  slug: InputValue;
  title: InputValue;
  premise: InputValue;
  genre?: InputValue;
  writingGoals?: InputValue;
  referenceTitle?: InputValue;
  referenceSummary?: InputValue;
  referenceNotes?: InputValue;
  worldBible?: InputValue;
  characterBible?: InputValue;
  outline?: InputValue;
  styleGuide?: InputValue;
  continuityNotes?: InputValue;
  status?: InputValue;
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toText(value: InputValue) {
  return typeof value === 'string' ? value : value?.toString() ?? '';
}

function normalizeStatus(value: string): NovelProjectStatus {
  if (value === 'serializing' || value === 'paused' || value === 'completed') {
    return value;
  }

  return 'planning';
}

export function validateNovelProjectInput(input: NovelProjectFormInput): NovelValidationResult {
  const slug = toText(input.slug).trim();
  const title = toText(input.title).trim();
  const premise = toText(input.premise).trim();
  const genre = toText(input.genre).trim();
  const writingGoals = toText(input.writingGoals).trim();
  const referenceTitle = toText(input.referenceTitle).trim();
  const referenceSummary = toText(input.referenceSummary).trim();
  const referenceNotes = toText(input.referenceNotes).trim();
  const worldBible = toText(input.worldBible).trim();
  const characterBible = toText(input.characterBible).trim();
  const outline = toText(input.outline).trim();
  const styleGuide = toText(input.styleGuide).trim();
  const continuityNotes = toText(input.continuityNotes).trim();
  const status = normalizeStatus(toText(input.status).trim());
  const fieldErrors: ValidationFailure['fieldErrors'] = {};

  if (!SLUG_PATTERN.test(slug)) {
    fieldErrors.slug = 'Slug 仅支持小写字母、数字和短横线';
  }

  if (!title) {
    fieldErrors.title = '项目标题不能为空';
  }

  if (!premise) {
    fieldErrors.premise = '核心设定不能为空';
  }

  if (title.length > 120) {
    fieldErrors.title = '项目标题请控制在 120 个字符以内';
  }

  if (premise.length > 500) {
    fieldErrors.premise = '核心设定请控制在 500 个字符以内';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: '请检查小说项目信息后再提交',
      fieldErrors,
    };
  }

  return {
    success: true,
    data: {
      slug,
      title,
      premise,
      genre,
      writingGoals,
      referenceTitle: referenceTitle || null,
      referenceSummary: referenceSummary || null,
      referenceNotes: referenceNotes || null,
      worldBible,
      characterBible,
      outline,
      styleGuide,
      continuityNotes,
      status,
    },
  };
}
