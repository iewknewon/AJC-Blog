import type { PostStatus, UpsertPostInput } from '../posts/types';

type InputValue = FormDataEntryValue | string | undefined | null;

type ValidationFailure = {
  success: false;
  message: string;
  fieldErrors: Partial<Record<keyof UpsertPostInput | 'tags' | 'cover', string>>;
};

type ValidationSuccess = {
  success: true;
  data: UpsertPostInput;
};

export type ValidationResult = ValidationSuccess | ValidationFailure;

export type PostFormInput = {
  slug: InputValue;
  title: InputValue;
  description: InputValue;
  content: InputValue;
  tags: InputValue;
  cover: InputValue;
  featured: InputValue;
  status: InputValue;
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toText(value: InputValue) {
  return typeof value === 'string' ? value : value?.toString() ?? '';
}

function normalizeTags(value: string) {
  return [...new Set(value.split(/[，,]/).map((item) => item.trim()).filter(Boolean))];
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validatePostInput(input: PostFormInput): ValidationResult {
  const slug = toText(input.slug).trim();
  const title = toText(input.title).trim();
  const description = toText(input.description).trim();
  const content = toText(input.content);
  const tags = normalizeTags(toText(input.tags));
  const cover = toText(input.cover).trim();
  const featured = toText(input.featured) === 'on';
  const status = toText(input.status) === 'published' ? 'published' : 'draft';
  const fieldErrors: ValidationFailure['fieldErrors'] = {};

  if (!SLUG_PATTERN.test(slug)) {
    fieldErrors.slug = 'Slug 仅支持小写字母、数字和中划线';
  }

  if (!title) {
    fieldErrors.title = '标题不能为空';
  }

  if (!description) {
    fieldErrors.description = '摘要不能为空';
  }

  if (!content.trim()) {
    fieldErrors.content = '正文不能为空';
  }

  if (tags.length === 0) {
    fieldErrors.tags = '请至少填写一个标签';
  }

  if (cover && !isValidHttpUrl(cover)) {
    fieldErrors.cover = '封面地址必须是 http 或 https URL';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: '请检查文章信息后再提交',
      fieldErrors,
    };
  }

  return {
    success: true,
    data: {
      slug,
      title,
      description,
      content,
      tags,
      cover: cover || null,
      featured,
      status: status as PostStatus,
    },
  };
}
