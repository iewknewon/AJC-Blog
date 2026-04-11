import { validatePostInput } from '../../../../lib/admin/validation';
import { requireAdminApiAuth } from '../../../../lib/auth/guards';
import { getPostById, updatePost } from '../../../../lib/posts/repository';

export async function POST(context) {
  const unauthorized = await requireAdminApiAuth({
    cookies: context.cookies,
    secret: context.locals.runtime.env.SESSION_SECRET,
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

  await updatePost(context.locals.runtime.env.DB, id, validation.data);
  return context.redirect(`/admin/posts/${id}`);
}
