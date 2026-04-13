import { requireAdminApiAuth } from '../../../../lib/auth/guards';
import { createNovelProject } from '../../../../lib/novels/repository';
import { validateNovelProjectInput } from '../../../../lib/novels/validation';

export async function POST(context) {
  const unauthorized = await requireAdminApiAuth({
    cookies: context.cookies,
    env: context.locals.runtime?.env,
  });

  if (unauthorized) {
    return unauthorized;
  }

  const formData = await context.request.formData();
  const validation = validateNovelProjectInput({
    slug: formData.get('slug'),
    title: formData.get('title'),
    premise: formData.get('premise'),
    genre: formData.get('genre'),
    writingGoals: formData.get('writingGoals'),
    referenceTitle: formData.get('referenceTitle'),
    referenceSummary: formData.get('referenceSummary'),
    referenceNotes: formData.get('referenceNotes'),
    worldBible: formData.get('worldBible'),
    characterBible: formData.get('characterBible'),
    outline: formData.get('outline'),
    styleGuide: formData.get('styleGuide'),
    continuityNotes: formData.get('continuityNotes'),
    status: formData.get('status'),
  });

  if (!validation.success) {
    return context.redirect('/admin/novels/new?error=1');
  }

  try {
    const project = await createNovelProject(context.locals.runtime.env.DB, validation.data);

    if (!project) {
      return context.redirect('/admin/novels/new?error=1');
    }

    return context.redirect(`/admin/novels/${project.id}`);
  } catch {
    return context.redirect('/admin/novels/new?error=1');
  }
}
