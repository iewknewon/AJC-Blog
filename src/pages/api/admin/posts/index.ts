import { validatePostInput } from '../../../../lib/admin/validation';
import { requireAdminApiAuth } from '../../../../lib/auth/guards';
import { createPost } from '../../../../lib/posts/repository';

export async function POST(context) {
  const unauthorized = await requireAdminApiAuth({
    cookies: context.cookies,
    secret: context.locals.runtime.env.SESSION_SECRET,
  });

  if (unauthorized) {
    return unauthorized;
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
    return context.redirect('/admin/posts/new?error=1');
  }

  const post = await createPost(context.locals.runtime.env.DB, validation.data);

  if (!post) {
    return context.redirect('/admin/posts/new?error=1');
  }

  return context.redirect(`/admin/posts/${post.id}`);
}
