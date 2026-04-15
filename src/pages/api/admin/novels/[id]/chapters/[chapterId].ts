import { validatePostInput } from '../../../../../../lib/admin/validation';
import { requireAdminApiAuth } from '../../../../../../lib/auth/guards';
import {
  deleteNovelChapterByPostId,
  getNovelChapterById,
  rebuildNovelProjectContinuityNotes,
  syncNovelChapterByPost,
} from '../../../../../../lib/novels/repository';
import { deletePost, getPostById, updatePost } from '../../../../../../lib/posts/repository';

export async function POST(context) {
  const unauthorized = await requireAdminApiAuth({
    cookies: context.cookies,
    env: context.locals.runtime?.env,
  });

  if (unauthorized) {
    return unauthorized;
  }

  const { id, chapterId } = context.params;

  if (!id || !chapterId) {
    return context.redirect('/admin/novels');
  }

  const db = context.locals.runtime.env.DB;
  const chapter = await getNovelChapterById(db, chapterId);

  if (!chapter || chapter.projectId !== id || !chapter.postId) {
    return context.redirect(`/admin/novels/${id}`);
  }

  const existingPost = await getPostById(db, chapter.postId);

  if (!existingPost) {
    return context.redirect(`/admin/novels/${id}`);
  }

  const formData = await context.request.formData();

  if (String(formData.get('intent') ?? '') === 'delete') {
    await deleteNovelChapterByPostId(db, chapter.postId);
    await deletePost(db, chapter.postId);
    await rebuildNovelProjectContinuityNotes(db, chapter.projectId);
    return context.redirect(`/admin/novels/${id}`);
  }

  const validation = validatePostInput({
    slug: formData.get('slug'),
    title: formData.get('title'),
    description: formData.get('description'),
    content: formData.get('content'),
    tags: formData.get('tags'),
    cover: formData.get('cover'),
    featured: formData.get('featured'),
    status: formData.get('status'),
  });

  if (!validation.success) {
    return context.redirect(`/admin/novels/${id}/chapters/${chapterId}?error=1`);
  }

  const post = await updatePost(db, chapter.postId, validation.data);

  if (post) {
    await syncNovelChapterByPost(db, post);
    await rebuildNovelProjectContinuityNotes(db, chapter.projectId);
  }

  return context.redirect(`/admin/novels/${id}/chapters/${chapterId}`);
}
