import { validatePostInput } from '../../../../lib/admin/validation';
import { requireAdminApiAuth } from '../../../../lib/auth/guards';
import { deleteNovelChapterByPostId, syncNovelChapterByPost } from '../../../../lib/novels/repository';
import { deletePost, getPostById, updatePost } from '../../../../lib/posts/repository';

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
    return context.redirect('/admin/posts');
  }

  const existingPost = await getPostById(context.locals.runtime.env.DB, id);

  if (!existingPost) {
    return context.redirect('/admin/posts');
  }

  const formData = await context.request.formData();
  const db = context.locals.runtime.env.DB;

  if (String(formData.get('intent') ?? '') === 'delete') {
    await deleteNovelChapterByPostId(db, id);
    await deletePost(db, id);
    return context.redirect('/admin/posts');
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
    return context.redirect(`/admin/posts/${id}?error=1`);
  }

  const post = await updatePost(db, id, validation.data);

  if (post) {
    await syncNovelChapterByPost(db, post);
  }

  return context.redirect(`/admin/posts/${id}`);
}
