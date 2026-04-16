import { requireAdminApiAuth } from '../../../../lib/auth/guards';
import { createLearningTrack } from '../../../../lib/learning/repository';
import { validateLearningTrackInput } from '../../../../lib/learning/validation';

export async function POST(context) {
  const unauthorized = await requireAdminApiAuth({
    cookies: context.cookies,
    env: context.locals.runtime?.env,
  });

  if (unauthorized) {
    return unauthorized;
  }

  const db = context.locals.runtime?.env?.DB;

  if (!db) {
    return context.redirect('/admin/learning/new?error=1');
  }

  const formData = await context.request.formData();
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
    return context.redirect('/admin/learning/new?error=1');
  }

  try {
    const track = await createLearningTrack(db, validation.data);

    if (!track) {
      return context.redirect('/admin/learning/new?error=1');
    }

    return context.redirect(`/admin/learning/${track.id}`);
  } catch {
    return context.redirect('/admin/learning/new?error=1');
  }
}
