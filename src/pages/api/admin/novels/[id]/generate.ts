import {
  buildNovelChapterPrompt,
  buildNovelPostTags,
  buildNovelResearchQuery,
  buildNovelSystemPrompt,
  getNextNovelChapterPosition,
  generateNovelMemoryUpdate,
  generateNovelNextChapterPlan,
  generateNovelReferencePack,
  type NovelLengthPreset,
  mergeNovelContinuityNotes,
} from '../../../../../lib/ai/novels';
import { streamCompatibleText } from '../../../../../lib/ai/openai-generic';
import { parseGeneratedPostDraft } from '../../../../../lib/ai/openai-compatible';
import { collectWebResearch } from '../../../../../lib/ai/web-search';
import { validatePostInput } from '../../../../../lib/admin/validation';
import { requireAdminApiAuth } from '../../../../../lib/auth/guards';
import {
  createNovelChapter,
  getNovelChaptersByProjectId,
  getNovelProjectById,
  getNovelReferenceSources,
  replaceNovelReferenceSources,
  toNovelProjectInput,
  updateNovelProject,
} from '../../../../../lib/novels/repository';
import { validateNovelProjectInput } from '../../../../../lib/novels/validation';
import { createPost, getPostBySlug } from '../../../../../lib/posts/repository';
import { getNovelChapterUrl } from '../../../../../utils/novels';

type GeneratePayload = {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  volumeNumber?: number;
  chapterNumber?: number;
  chapterBrief?: string;
  chapterTitleHint?: string;
  chapterRole?: string;
  titleDirection?: string;
  endingStrategy?: string;
  endingNote?: string;
  forceFreshResearch?: boolean;
  lengthPreset?: string;
  status?: string;
  autoPlan?: boolean;
  project?: Record<string, unknown>;
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

const SSE_HEARTBEAT_INTERVAL_MS = 15_000;

function parseLengthPreset(value: unknown): NovelLengthPreset {
  if (value === 'tight' || value === 'expanded') {
    return value;
  }

  return 'standard';
}

function parsePositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.round(parsed);
}

function buildFallbackPack(sources: Array<{ title: string; snippet: string; excerpt?: string }>) {
  return {
    referenceSummary: sources
      .slice(0, 3)
      .map((source) => `${source.title}：${source.snippet || source.excerpt || ''}`.trim())
      .filter(Boolean)
      .join('\n'),
    referenceNotes: sources
      .slice(0, 4)
      .map((source) => `- ${source.title}\n  ${(source.excerpt || source.snippet || '').trim()}`)
      .join('\n'),
  };
}

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
    return json({ message: '缺少小说项目 id。' }, 400);
  }

  const db = context.locals.runtime?.env?.DB;

  if (!db) {
    return json({ message: '当前环境缺少数据库绑定。' }, 500);
  }

  const existingProject = await getNovelProjectById(db, id);

  if (!existingProject) {
    return json({ message: '没有找到对应的小说项目。' }, 404);
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
  const chapterBrief = String(payload.chapterBrief ?? '').trim();
  const chapterTitleHint = String(payload.chapterTitleHint ?? '').trim();
  const chapterRole = String(payload.chapterRole ?? '').trim();
  const titleDirection = String(payload.titleDirection ?? '').trim();
  const endingStrategy = String(payload.endingStrategy ?? '').trim();
  const endingNote = String(payload.endingNote ?? '').trim();
  const forceFreshResearch = payload.forceFreshResearch === true;
  const status = payload.status === 'published' ? 'published' : 'draft';
  const lengthPreset = parseLengthPreset(payload.lengthPreset);
  const autoPlan = payload.autoPlan === true || (!chapterBrief && !chapterTitleHint);

  if (!baseUrl || !apiKey || !model) {
    return json({ message: '请先填写 Base URL、API Key 和模型。' }, 400);
  }

  if (!chapterBrief && !autoPlan) {
    return json({ message: '请先填写这一章的任务说明。' }, 400);
  }

  const validation = validateNovelProjectInput(payload.project
    ? {
        slug: payload.project.slug,
        title: payload.project.title,
        premise: payload.project.premise,
        genre: payload.project.genre,
        writingGoals: payload.project.writingGoals,
        referenceTitle: payload.project.referenceTitle,
        referenceSummary: payload.project.referenceSummary,
        referenceNotes: payload.project.referenceNotes,
        worldBible: payload.project.worldBible,
        characterBible: payload.project.characterBible,
        outline: payload.project.outline,
        styleGuide: payload.project.styleGuide,
        continuityNotes: payload.project.continuityNotes,
        status: payload.project.status,
      }
    : toNovelProjectInput(existingProject));

  if (!validation.success) {
    return json({ message: validation.message, fieldErrors: validation.fieldErrors }, 400);
  }

  let project = await updateNovelProject(db, id, validation.data) ?? existingProject;
  let chapters = await getNovelChaptersByProjectId(db, id);
  const volumeNumber = parsePositiveInteger(payload.volumeNumber, Math.max(1, project.lastVolumeNumber || 1));
  const chapterNumber = parsePositiveInteger(payload.chapterNumber, Math.max(1, project.lastChapterNumber + 1 || 1));

  if (chapters.some((chapter) => chapter.volumeNumber === volumeNumber && chapter.chapterNumber === chapterNumber)) {
    return json({ message: `第 ${volumeNumber} 卷第 ${chapterNumber} 章已经存在，请换一个章节编号。` }, 409);
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastStatusMessage = '正在准备续写任务...';
      const send = (event: string, eventPayload: Record<string, unknown>) => {
        if (event === 'status' && typeof eventPayload.message === 'string') {
          lastStatusMessage = eventPayload.message;
        }

        controller.enqueue(encoder.encode(createSseEvent(event, eventPayload)));
      };

      let rawText = '';
      let closed = false;
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

      const startHeartbeat = () => {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
        }

        heartbeatTimer = setInterval(() => {
          if (closed) {
            return;
          }

          send('heartbeat', {
            message: `${lastStatusMessage}（连接正常，仍在处理中...）`,
            timestamp: Date.now(),
          });
        }, SSE_HEARTBEAT_INTERVAL_MS);
      };

      const close = () => {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }

        if (!closed) {
          closed = true;
          controller.close();
        }
      };

      try {
        startHeartbeat();
        let sources = await getNovelReferenceSources(db, id);
        let effectiveChapterBrief = chapterBrief;
        let effectiveChapterTitleHint = chapterTitleHint;
        let effectiveChapterRole = chapterRole;
        let effectiveTitleDirection = titleDirection;
        let effectiveEndingStrategy = endingStrategy;
        let effectiveEndingNote = endingNote;

        if (project.referenceTitle && (sources.length === 0 || forceFreshResearch)) {
          const query = buildNovelResearchQuery(project);
          send('status', {
            message: forceFreshResearch
              ? `正在强制重新联网检索参考作品资料：${query}`
              : `正在补充参考作品资料：${query}`,
          });

          try {
            const research = await collectWebResearch(query, {
              searchLimit: 6,
              pageFetchLimit: 4,
              baseUrl,
              apiKey,
              model,
              mode: 'auto',
            });

            sources = await replaceNovelReferenceSources(
              db,
              id,
              research.sources.map((source) => ({
                title: source.title,
                url: source.url,
                snippet: source.snippet,
                excerpt: source.excerpt,
              })),
            );

            const pack = sources.length
              ? await generateNovelReferencePack(baseUrl, apiKey, model, project, sources)
              : buildFallbackPack(sources);

            project = await updateNovelProject(db, id, {
              ...toNovelProjectInput(project),
              referenceSummary: pack.referenceSummary || project.referenceSummary || null,
              referenceNotes: pack.referenceNotes || project.referenceNotes || null,
            }) ?? project;

            send('research', {
              query,
              summary: research.summary,
              strategy: research.strategy,
              strategyLabel: research.strategyLabel,
              provider: research.provider,
              fallbackReason: research.fallbackReason,
              sources: sources.map((source) => ({
                title: source.title,
                url: source.url,
                snippet: source.snippet,
                excerpt: source.excerpt,
              })),
              referenceSummary: project.referenceSummary ?? '',
              referenceNotes: project.referenceNotes ?? '',
              message: sources.length
                ? `${forceFreshResearch ? '已强制重新通过' : '已通过'}${research.strategyLabel}载入 ${sources.length} 条参考资料，并自动整理成续写参考包。`
                : '这次没有检索到足够稳定的参考资料，继续按照当前项目设定写作。',
            });
          } catch (error) {
            send('research', {
              query,
              strategy: 'local',
              strategyLabel: '检索失败',
              provider: '',
              fallbackReason: '',
              sources: [],
              message: error instanceof Error
                ? `${error.message}，这次将继续使用你手动填写的设定。`
                : '参考资料检索失败，这次将继续使用你手动填写的设定。',
            });
          }
        } else if (project.referenceTitle && sources.length > 0) {
          send('research', {
            query: buildNovelResearchQuery(project),
            summary: project.referenceSummary ?? '',
            strategy: 'cache',
            strategyLabel: '已复用本地参考缓存',
            provider: '',
            fallbackReason: '',
            sources: sources.map((source) => ({
              title: source.title,
              url: source.url,
              snippet: source.snippet,
              excerpt: source.excerpt,
            })),
            referenceSummary: project.referenceSummary ?? '',
            referenceNotes: project.referenceNotes ?? '',
            message: `本次直接复用了已保存的 ${sources.length} 条参考资料，没有重新联网检索。`,
          });
        }

        if (autoPlan || !effectiveChapterBrief) {
          send('status', { message: '正在自动规划下一章任务卡...' });

          const plan = await generateNovelNextChapterPlan(baseUrl, apiKey, model, {
            project,
            chapters,
            sources,
            volumeNumber,
            chapterNumber,
          });

          effectiveChapterTitleHint = autoPlan ? plan.chapterTitleHint : (effectiveChapterTitleHint || plan.chapterTitleHint);
          effectiveChapterBrief = plan.chapterBrief;
          effectiveChapterRole = autoPlan ? plan.chapterRole : (effectiveChapterRole || plan.chapterRole);
          effectiveTitleDirection = autoPlan ? plan.titleDirection : (effectiveTitleDirection || plan.titleDirection);
          effectiveEndingStrategy = autoPlan ? plan.endingStrategy : (effectiveEndingStrategy || plan.endingStrategy);
          effectiveEndingNote = autoPlan ? plan.endingNote : (effectiveEndingNote || plan.endingNote);

          send('plan', {
            ...plan,
            message: '已自动生成下一章任务卡，接下来开始续写。',
          });
        }

        send('status', { message: '正在流式写作这一章...' });

        for await (const chunk of streamCompatibleText(baseUrl, apiKey, model, {
          systemPrompt: buildNovelSystemPrompt(),
          userPrompt: buildNovelChapterPrompt({
            project,
            chapters,
            sources,
            volumeNumber,
            chapterNumber,
            chapterBrief: effectiveChapterBrief,
            chapterTitleHint: effectiveChapterTitleHint,
            chapterRole: effectiveChapterRole,
            titleDirection: effectiveTitleDirection,
            endingStrategy: effectiveEndingStrategy,
            endingNote: effectiveEndingNote,
            lengthPreset,
          }),
          temperature: 0.85,
        })) {
          rawText += chunk;
          send('content', { chunk });
        }

        send('status', { message: '正文已生成，正在整理章节记忆并写入博客...' });

        const generated = parseGeneratedPostDraft(
          rawText,
          effectiveChapterTitleHint || `${project.title} 第${chapterNumber}章`,
        );
        const uniqueSlug = await buildUniqueSlug(db, generated.slug);
        const tags = buildNovelPostTags(project, generated.tags);
        const validationResult = validatePostInput({
          slug: uniqueSlug,
          title: generated.title,
          description: generated.description,
          content: generated.content,
          tags: tags.join(', '),
          cover: '',
          featured: '',
          status,
        });

        if (!validationResult.success) {
          send('error', {
            message: '章节正文已经生成，但保存为博客文章前没有通过校验。',
            fieldErrors: validationResult.fieldErrors,
            rawText,
          });
          close();
          return;
        }

        const post = await createPost(db, validationResult.data);

        if (!post) {
          send('error', {
            message: '章节保存失败，请稍后再试。',
            rawText,
          });
          close();
          return;
        }

        let memoryUpdate = {
          summary: generated.description,
          continuityDelta: `- 第${chapterNumber}章新增事件：${generated.description}`,
        };

        try {
          memoryUpdate = await generateNovelMemoryUpdate(baseUrl, apiKey, model, {
            project,
            volumeNumber,
            chapterNumber,
            chapterTitle: generated.title,
            chapterDescription: generated.description,
            chapterContent: generated.content,
          });
        } catch (error) {
          console.error('[admin-novels-generate] failed to update memory', error);
        }

        const chapter = await createNovelChapter(db, {
          projectId: id,
          volumeNumber,
          chapterNumber,
          title: generated.title,
          description: generated.description,
          brief: effectiveChapterBrief,
          summary: memoryUpdate.summary,
          continuityDelta: memoryUpdate.continuityDelta,
          postId: post.id,
          postSlug: post.slug,
          status: post.status,
        });

        if (!chapter) {
          send('error', {
            message: '章节记录写入失败，但博客文章已经创建，请先到文章管理里确认内容。',
            rawText,
          });
          close();
          return;
        }

        project = await updateNovelProject(db, id, {
          ...toNovelProjectInput(project),
          status: project.status === 'planning' ? 'serializing' : project.status,
          continuityNotes: mergeNovelContinuityNotes(
            project.continuityNotes,
            volumeNumber,
            chapterNumber,
            generated.title,
            memoryUpdate.continuityDelta,
          ),
        }) ?? project;
        chapters = await getNovelChaptersByProjectId(db, id);
        const nextChapter = getNextNovelChapterPosition(chapters);

        send('done', {
          message: status === 'published'
            ? `第${chapterNumber}章已经生成并发布。`
            : `第${chapterNumber}章已经生成并保存为草稿。`,
          rawText,
          post: {
            id: post.id,
            title: post.title,
            slug: post.slug,
            status: post.status,
            adminUrl: `/admin/posts/${post.id}`,
            publicUrl: post.status === 'published'
              ? getNovelChapterUrl(project.slug, chapter.volumeNumber, chapter.chapterNumber)
              : null,
          },
          chapter: {
            id: chapter.id,
            volumeNumber: chapter.volumeNumber,
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
          },
          project: {
            id: project.id,
            status: project.status,
            chaptersCount: chapters.length,
            continuityNotes: project.continuityNotes,
            nextChapter,
          },
        });
      } catch (error) {
        send('error', {
          message: error instanceof Error ? error.message : '章节生成失败，请稍后再试。',
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
