import { parseGeneratedPostDraft, streamCompatiblePostText } from '../../../../lib/ai/openai-compatible';
import { collectWebResearch } from '../../../../lib/ai/web-search';
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

function createSseEvent(event: string, payload: Record<string, unknown>) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
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
    customPrompt?: string;
    systemPrompt?: string;
    webSearchEnabled?: boolean;
    webSearchQuery?: string;
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
  const webSearchEnabled = Boolean(payload.webSearchEnabled);
  const webSearchQuery = String(payload.webSearchQuery ?? '').trim();

  if (!baseUrl || !apiKey || !model || !topic) {
    return json({ message: '请填写 Base URL、API Key、模型和文章主题。' }, 400);
  }

  const encoder = new TextEncoder();
  const db = context.locals.runtime.env.DB;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, eventPayload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(createSseEvent(event, eventPayload)));
      };

      let rawText = '';
      let closed = false;
      const close = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      };

      try {
        let webResearch: Awaited<ReturnType<typeof collectWebResearch>> | null = null;

        if (webSearchEnabled) {
          const query = webSearchQuery || topic;
          send('status', { message: `正在联网检索参考资料：${query}` });

          try {
            webResearch = await collectWebResearch(query);
            send('research', {
              query,
              sources: webResearch.sources.map((source) => ({
                title: source.title,
                url: source.url,
                snippet: source.snippet,
              })),
              message: webResearch.sources.length
                ? `已整理 ${webResearch.sources.length} 条联网资料，开始流式写作...`
                : '本次没有检索到可用资料，将按你的提示词继续写作。',
            });
          } catch (error) {
            send('research', {
              query,
              sources: [],
              message: error instanceof Error
                ? `${error.message}，本次改为不联网继续写作。`
                : '联网检索失败，本次改为不联网继续写作。',
            });
          }
        }

        send('status', { message: '已连接模型，开始流式写作...' });

        for await (const chunk of streamCompatiblePostText(baseUrl, apiKey, model, {
          topic,
          keywords: payload.keywords,
          audience: payload.audience,
          requirements: payload.requirements,
          customPrompt: payload.customPrompt,
          systemPrompt: payload.systemPrompt,
          webResearch,
        })) {
          rawText += chunk;
          send('content', { chunk });
        }

        send('status', { message: 'AI 写作完成，正在整理文章并创建博客...' });

        const generated = parseGeneratedPostDraft(rawText, topic);
        const uniqueSlug = await buildUniqueSlug(db, generated.slug);
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
          send('error', {
            message: 'AI 已生成内容，但未通过文章校验，请调整要求后重试。',
            fieldErrors: validation.fieldErrors,
            rawText,
          });
          close();
          return;
        }

        const post = await createPost(db, validation.data);

        if (!post) {
          send('error', { message: '文章创建失败，请稍后再试。', rawText });
          close();
          return;
        }

        send('done', {
          message: status === 'published' ? 'AI 文章已生成并发布。' : 'AI 文章已生成并保存为草稿。',
          rawText,
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
        send('error', {
          message: error instanceof Error ? error.message : 'AI 写作失败，请稍后重试。',
          rawText,
        });
      } finally {
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
