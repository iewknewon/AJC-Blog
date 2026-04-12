import {
  generateVisualSearchPlan,
  parseGeneratedPostDraft,
  streamCompatiblePostText,
  type PostLengthPreset,
} from '../../../../lib/ai/openai-compatible';
import {
  injectInlineIllustrations,
  type AppliedInlineIllustration,
} from '../../../../lib/ai/post-assets';
import { collectWebResearch } from '../../../../lib/ai/web-search';
import { validatePostInput } from '../../../../lib/admin/validation';
import { requireAdminApiAuth } from '../../../../lib/auth/guards';
import {
  suggestCoverFromContent,
  suggestImageForQuery,
  type CoverSuggestion,
} from '../../../../lib/covers/suggestions';
import { createPost, getPostBySlug } from '../../../../lib/posts/repository';

type GeneratePayload = {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  topic?: string;
  keywords?: string;
  audience?: string;
  requirements?: string;
  customPrompt?: string;
  systemPrompt?: string;
  lengthPreset?: string;
  webSearchEnabled?: boolean;
  webSearchQuery?: string;
  cover?: string;
  autoCoverEnabled?: boolean;
  autoIllustrationsEnabled?: boolean;
  illustrationCount?: number;
  status?: string;
  featured?: boolean;
};

type AssetCoverPayload = {
  url: string;
  previewUrl: string;
  title?: string;
  query?: string;
  creator?: string;
  license?: string;
  sourceUrl?: string;
  mode: 'auto' | 'manual';
};

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

function parseLengthPreset(value: unknown): PostLengthPreset {
  if (value === 'standard' || value === 'detailed') {
    return value;
  }

  return 'compact';
}

function parseIllustrationCount(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 2;
  }

  return Math.min(4, Math.max(1, Math.round(parsed)));
}

function quoteYamlString(value: string) {
  return JSON.stringify(value);
}

function buildPreviewMarkdown(input: {
  title: string;
  slug: string;
  description: string;
  tags: string[];
  cover?: string;
  content: string;
}) {
  const lines = [
    '---',
    `title: ${quoteYamlString(input.title)}`,
    `slug: ${quoteYamlString(input.slug)}`,
    `description: ${quoteYamlString(input.description)}`,
    'tags:',
    ...input.tags.map((tag) => `  - ${quoteYamlString(tag)}`),
  ];

  if (input.cover) {
    lines.push(`cover: ${quoteYamlString(input.cover)}`);
  }

  lines.push('---', '', input.content.trim());
  return lines.join('\n');
}

function toCoverPayload(
  autoCover: CoverSuggestion | null,
  finalCoverUrl: string,
  manualCoverUrl: string,
): AssetCoverPayload | null {
  if (autoCover) {
    return {
      url: autoCover.coverUrl,
      previewUrl: autoCover.previewUrl,
      title: autoCover.title,
      query: autoCover.query,
      creator: autoCover.creator,
      license: autoCover.license,
      sourceUrl: autoCover.sourceUrl,
      mode: 'auto',
    };
  }

  if (!finalCoverUrl || finalCoverUrl !== manualCoverUrl) {
    return null;
  }

  return {
    url: finalCoverUrl,
    previewUrl: finalCoverUrl,
    title: 'Manual cover',
    mode: 'manual',
  };
}

function buildAssetMessage(
  cover: AssetCoverPayload | null,
  illustrations: AppliedInlineIllustration[],
  attemptedCoverSearch: boolean,
  attemptedIllustrationSearch: boolean,
) {
  const parts: string[] = [];

  if (cover?.mode === 'auto') {
    parts.push('已自动匹配封面');
  } else if (cover?.mode === 'manual') {
    parts.push('已保留手动封面');
  }

  if (illustrations.length) {
    parts.push(`已插入 ${illustrations.length} 张配图`);
  }

  if (parts.length) {
    return `${parts.join('，')}。`;
  }

  if (attemptedCoverSearch || attemptedIllustrationSearch) {
    return '这次没有找到足够合适的图片，文章会先按纯文本保存。';
  }

  return '文章内容已生成。';
}

export async function POST(context) {
  const unauthorized = await requireAdminApiAuth({
    cookies: context.cookies,
    env: context.locals.runtime?.env,
  });

  if (unauthorized) {
    return unauthorized;
  }

  let payload: GeneratePayload;

  try {
    payload = await context.request.json();
  } catch {
    return json({ message: '请求体不是合法的 JSON。' }, 400);
  }

  const baseUrl = String(payload.baseUrl ?? '').trim();
  const apiKey = String(payload.apiKey ?? '').trim();
  const model = String(payload.model ?? '').trim();
  const topic = String(payload.topic ?? '').trim();
  const manualCover = String(payload.cover ?? '').trim();
  const status = payload.status === 'published' ? 'published' : 'draft';
  const featured = Boolean(payload.featured);
  const lengthPreset = parseLengthPreset(payload.lengthPreset);
  const webSearchEnabled = Boolean(payload.webSearchEnabled);
  const webSearchQuery = String(payload.webSearchQuery ?? '').trim();
  const autoCoverEnabled = payload.autoCoverEnabled !== false;
  const autoIllustrationsEnabled = payload.autoIllustrationsEnabled !== false;
  const illustrationCount = parseIllustrationCount(payload.illustrationCount);
  const db = context.locals.runtime?.env?.DB;

  if (!baseUrl || !apiKey || !model || !topic) {
    return json({ message: '请先填写 Base URL、API Key、模型和文章主题。' }, 400);
  }

  if (!db) {
    return json({ message: '当前环境缺少数据库绑定。' }, 500);
  }

  const encoder = new TextEncoder();

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
                ? `已整理 ${webResearch.sources.length} 条参考资料，开始写作。`
                : '没有检索到可靠资料，这次会继续按普通模式写作。',
            });
          } catch (error) {
            send('research', {
              query,
              sources: [],
              message: error instanceof Error
                ? `${error.message}，这次先跳过联网检索。`
                : '联网检索失败，这次先跳过联网检索。',
            });
          }
        }

        send('status', { message: '正在流式生成文章正文...' });

        for await (const chunk of streamCompatiblePostText(baseUrl, apiKey, model, {
          topic,
          keywords: payload.keywords,
          audience: payload.audience,
          requirements: payload.requirements,
          customPrompt: payload.customPrompt,
          systemPrompt: payload.systemPrompt,
          lengthPreset,
          webResearch,
        })) {
          rawText += chunk;
          send('content', { chunk });
        }

        send('status', { message: '正文已生成，正在整理封面和配图...' });

        const generated = parseGeneratedPostDraft(rawText, topic);
        const uniqueSlug = await buildUniqueSlug(db, generated.slug);
        let finalContent = generated.content;
        let finalCover = manualCover;
        let autoCover: CoverSuggestion | null = null;
        let appliedIllustrations: AppliedInlineIllustration[] = [];
        let previewText = buildPreviewMarkdown({
          title: generated.title,
          slug: uniqueSlug,
          description: generated.description,
          tags: generated.tags,
          cover: finalCover || undefined,
          content: finalContent,
        });

        if (autoCoverEnabled || autoIllustrationsEnabled) {
          try {
            const visualPlan = await generateVisualSearchPlan(baseUrl, apiKey, model, {
              title: generated.title,
              description: generated.description,
              tags: generated.tags,
              content: generated.content,
              maxIllustrations: illustrationCount,
            });

            if (!finalCover && autoCoverEnabled) {
              autoCover = await suggestCoverFromContent(
                {
                  title: generated.title,
                  description: generated.description,
                  tags: generated.tags,
                  content: generated.content,
                },
                {
                  preferredQueries: visualPlan.coverQueries,
                },
              );

              if (autoCover) {
                finalCover = autoCover.coverUrl;
              }
            }

            if (autoIllustrationsEnabled && visualPlan.illustrations.length) {
              const illustrationResults = await Promise.allSettled(
                visualPlan.illustrations.slice(0, illustrationCount).map(async (item) => {
                  const suggestion = await suggestImageForQuery(item.query, {
                    queryMode: 'ai',
                  });

                  if (!suggestion) {
                    return null;
                  }

                  return {
                    ...item,
                    imageUrl: suggestion.coverUrl,
                    previewUrl: suggestion.previewUrl,
                    creator: suggestion.creator,
                    license: suggestion.license,
                    sourceUrl: suggestion.sourceUrl,
                  } satisfies AppliedInlineIllustration;
                }),
              );

              appliedIllustrations = illustrationResults.flatMap((result) => (
                result.status === 'fulfilled' && result.value ? [result.value] : []
              ));

              if (appliedIllustrations.length) {
                finalContent = injectInlineIllustrations(generated.content, appliedIllustrations);
              }
            }

            previewText = buildPreviewMarkdown({
              title: generated.title,
              slug: uniqueSlug,
              description: generated.description,
              tags: generated.tags,
              cover: finalCover || undefined,
              content: finalContent,
            });

            send('assets', {
              message: buildAssetMessage(
                toCoverPayload(autoCover, finalCover, manualCover),
                appliedIllustrations,
                autoCoverEnabled && !manualCover,
                autoIllustrationsEnabled,
              ),
              cover: toCoverPayload(autoCover, finalCover, manualCover),
              illustrations: appliedIllustrations,
              plan: {
                coverQueries: visualPlan.coverQueries,
                illustrations: visualPlan.illustrations.map((item) => ({
                  heading: item.heading,
                  query: item.query,
                })),
              },
            });
          } catch (error) {
            console.error('[admin-ai-generate] visual asset enrichment failed', error);

            previewText = buildPreviewMarkdown({
              title: generated.title,
              slug: uniqueSlug,
              description: generated.description,
              tags: generated.tags,
              cover: finalCover || undefined,
              content: finalContent,
            });

            send('assets', {
              message: '自动匹配封面或配图时出错了，这次会先保留纯文本内容。',
              cover: toCoverPayload(autoCover, finalCover, manualCover),
              illustrations: [],
              plan: null,
            });
          }
        }

        const validation = validatePostInput({
          slug: uniqueSlug,
          title: generated.title,
          description: generated.description,
          content: finalContent,
          tags: generated.tags.join(', '),
          cover: finalCover,
          featured: featured ? 'on' : '',
          status,
        });

        if (!validation.success) {
          send('error', {
            message: '文章内容生成出来了，但保存前校验没有通过。',
            fieldErrors: validation.fieldErrors,
            rawText: previewText,
          });
          close();
          return;
        }

        const post = await createPost(db, validation.data);

        if (!post) {
          send('error', {
            message: '文章创建失败，请稍后再试。',
            rawText: previewText,
          });
          close();
          return;
        }

        send('done', {
          message: status === 'published'
            ? '文章已经生成并发布。'
            : '文章已经生成并保存为草稿。',
          rawText: previewText,
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
          message: error instanceof Error ? error.message : 'AI 写作失败，请稍后再试。',
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
