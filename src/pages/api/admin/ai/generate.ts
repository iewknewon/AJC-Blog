import { generateCompatiblePost } from '../../../../lib/ai/openai-compatible';
import { validatePostInput } from '../../../../lib/admin/validation';
import { requireAdminApiAuth } from '../../../../lib/auth/guards';
import { createPost, getPostBySlug } from '../../../../lib/posts/repository';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

async function buildUniqueSlug(db: D1Database, desiredSlug: string) {
  let candidate = desiredSlug;
  let suffix = 2;

  while (await getPostBySlug(db, candidate)) {
    candidate = `${desiredSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function POST(context) {
  const unauthorized = await requireAdminApiAuth({
    cookies: context.cookies,
    env: context.locals.runtime?.env,
  });

  if (unauthorized) {
    return unauthorized;
  }

  let payload: {
    baseUrl?: string;
    apiKey?: string;
    model?: string;
    topic?: string;
    keywords?: string;
    audience?: string;
    requirements?: string;
    cover?: string;
    status?: string;
    featured?: boolean;
  };

  try {
    payload = await context.request.json();
  } catch {
    return json({ message: '请求格式错误，请重新加载页面后重试。' }, 400);
  }

  const baseUrl = String(payload.baseUrl ?? '').trim();
  const apiKey = String(payload.apiKey ?? '').trim();
  const model = String(payload.model ?? '').trim();
  const topic = String(payload.topic ?? '').trim();
  const cover = String(payload.cover ?? '').trim();
  const status = payload.status === 'published' ? 'published' : 'draft';
  const featured = Boolean(payload.featured);

  if (!baseUrl || !apiKey || !model || !topic) {
    return json({ message: '请填写 Base URL、API Key、模型和文章主题。' }, 400);
  }

  try {
    const generated = await generateCompatiblePost(baseUrl, apiKey, model, {
      topic,
      keywords: payload.keywords,
      audience: payload.audience,
      requirements: payload.requirements,
    });

    const uniqueSlug = await buildUniqueSlug(context.locals.runtime.env.DB, generated.slug);
    const validation = validatePostInput({
      slug: uniqueSlug,
      title: generated.title,
      description: generated.description,
      content: generated.content,
      tags: generated.tags.join(', '),
      cover,
      featured: featured ? 'on' : '',
      status,
    });

    if (!validation.success) {
      return json({
        message: 'AI 已生成内容，但未通过文章校验，请调整要求后重试。',
        fieldErrors: validation.fieldErrors,
      }, 422);
    }

    const post = await createPost(context.locals.runtime.env.DB, validation.data);

    if (!post) {
      return json({ message: '文章创建失败，请稍后再试。' }, 500);
    }

    return json({
      message: status === 'published' ? 'AI 文章已生成并发布。' : 'AI 文章已生成并保存为草稿。',
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        status: post.status,
        adminUrl: `/admin/posts/${post.id}`,
        publicUrl: post.status === 'published' ? `/blog/${post.slug}/` : null,
      },
    });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'AI 写作失败，请稍后重试。' }, 502);
  }
}
