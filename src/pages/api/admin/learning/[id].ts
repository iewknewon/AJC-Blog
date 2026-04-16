import { requireAdminApiAuth } from '../../../../lib/auth/guards';
import {
  deleteLearningTrack,
  getLearningTrackById,
  updateLearningTrack,
} from '../../../../lib/learning/repository';
import { validateLearningTrackInput } from '../../../../lib/learning/validation';

export async function POST(context) {
  const unauthorized = await requireAdminApiAuth({
    cookies: context.cookies,
    env: context.locals.runtime?.env,
  });

  if (unauthorized) {
    return unauthorized;
  }

  const { id } = context.params;
  const db = context.locals.runtime?.env?.DB;

  if (!id || !db) {
    return context.redirect('/admin/learning');
  }

  const existingTrack = await getLearningTrackById(db, id);

  if (!existingTrack) {
    return context.redirect('/admin/learning');
  }

  const formData = await context.request.formData();

  if (String(formData.get('intent') ?? '') === 'delete') {
    await deleteLearningTrack(db, id);
    return context.redirect('/admin/learning');
  }

  const validation = validateLearningTrackInput({
    slug: formData.get('slug'),
    title: formData.get('title'),
    shortTitle: formData.get('shortTitle'),
    description: formData.get('description'),
    stageSlug: formData.get('stageSlug'),
    eyebrow: formData.get('eyebrow'),
    colorToken: formData.get('colorToken'),
    icon: formData.get('icon'),
    pageVariant: formData.get('pageVariant'),
    learningPath: formData.get('learningPath'),
    conceptOverview: formData.get('conceptOverview'),
    sourcePrompt: formData.get('sourcePrompt'),
    status: formData.get('status'),
  });

  if (!validation.success) {
    return context.redirect(`/admin/learning/${id}?error=1`);
  }

  try {
    await updateLearningTrack(db, id, validation.data);
    return context.redirect(`/admin/learning/${id}`);
  } catch {
    return context.redirect(`/admin/learning/${id}?error=1`);
  }
}
