import { requireAdminApiAuth } from '../../../../../../lib/auth/guards';
import {
  createLearningLesson,
  deleteLearningLesson,
  getLearningLessonById,
  getLearningTrackById,
  updateLearningLesson,
} from '../../../../../../lib/learning/repository';
import { validateLearningLessonInput } from '../../../../../../lib/learning/validation';

function parseJsonField(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();

  if (!text) {
    return [];
  }

  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

function buildLessonValidation(formData: FormData, trackId: string) {
  return validateLearningLessonInput({
    trackId,
    lessonSlug: formData.get('lessonSlug'),
    title: formData.get('title'),
    description: formData.get('description'),
    order: formData.get('order'),
    estimatedMinutes: formData.get('estimatedMinutes'),
    objectives: formData.get('objectives'),
    keywords: formData.get('keywords'),
    chatContextSummary: formData.get('chatContextSummary'),
    relatedLessonSlugs: formData.get('relatedLessonSlugs'),
    animation: formData.get('animation'),
    heroSummary: formData.get('heroSummary'),
    sections: parseJsonField(formData.get('sections')),
    misconceptions: parseJsonField(formData.get('misconceptions')),
    quiz: parseJsonField(formData.get('quiz')),
    quickPrompts: formData.get('quickPrompts'),
    status: formData.get('status'),
  });
}

export async function POST(context) {
  const unauthorized = await requireAdminApiAuth({
    cookies: context.cookies,
    env: context.locals.runtime?.env,
  });

  if (unauthorized) {
    return unauthorized;
  }

  const { id, lessonId } = context.params;
  const db = context.locals.runtime?.env?.DB;

  if (!id || !lessonId || !db) {
    return context.redirect('/admin/learning');
  }

  const track = await getLearningTrackById(db, id);

  if (!track) {
    return context.redirect('/admin/learning');
  }

  const formData = await context.request.formData();

  if (lessonId === 'new') {
    const validation = buildLessonValidation(formData, track.id);

    if (!validation.success) {
      return context.redirect(`/admin/learning/${track.id}?error=lesson`);
    }

    try {
      const lesson = await createLearningLesson(db, validation.data);

      if (!lesson) {
        return context.redirect(`/admin/learning/${track.id}?error=lesson`);
      }

      return context.redirect(`/admin/learning/${track.id}/lessons/${lesson.id}`);
    } catch {
      return context.redirect(`/admin/learning/${track.id}?error=lesson`);
    }
  }

  const existingLesson = await getLearningLessonById(db, lessonId);

  if (!existingLesson || existingLesson.trackId !== track.id) {
    return context.redirect(`/admin/learning/${track.id}`);
  }

  if (String(formData.get('intent') ?? '') === 'delete') {
    await deleteLearningLesson(db, lessonId);
    return context.redirect(`/admin/learning/${track.id}`);
  }

  const validation = buildLessonValidation(formData, track.id);

  if (!validation.success) {
    return context.redirect(`/admin/learning/${track.id}/lessons/${lessonId}?error=1`);
  }

  try {
    await updateLearningLesson(db, lessonId, validation.data);
    return context.redirect(`/admin/learning/${track.id}/lessons/${lessonId}`);
  } catch {
    return context.redirect(`/admin/learning/${track.id}/lessons/${lessonId}?error=1`);
  }
}
