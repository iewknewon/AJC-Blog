import { requireAdminApiAuth } from '../../../../lib/auth/guards';
import {
  deleteNovelProject,
  getNovelProjectById,
  updateNovelProject,
} from '../../../../lib/novels/repository';
import { validateNovelProjectInput } from '../../../../lib/novels/validation';

export async function POST(context) {
  const unauthorized = await requireAdminApiAuth({
    cookies: context.cookies,
    env: context.locals.runtime?.env,
  });

  if (unauthorized) {
    return unauthorized;
  }

  const { id } = context.params;

  if (!id) {
    return context.redirect('/admin/novels');
  }

  const db = context.locals.runtime.env.DB;
  const existingProject = await getNovelProjectById(db, id);

  if (!existingProject) {
    return context.redirect('/admin/novels');
  }

  const formData = await context.request.formData();

  if (String(formData.get('intent') ?? '') === 'delete') {
    await deleteNovelProject(db, id);
    return context.redirect('/admin/novels');
  }

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
    return context.redirect(`/admin/novels/${id}?error=1`);
  }

  try {
    await updateNovelProject(db, id, validation.data);
    return context.redirect(`/admin/novels/${id}`);
  } catch {
    return context.redirect(`/admin/novels/${id}?error=1`);
  }
}
