import {
  buildNovelChapterPrompt,
  buildNovelPostTags,
  buildNovelResearchQuery,
  generateNovelMemoryUpdate,
  generateNovelNextChapterPlan,
  generateNovelOutline,
  generateNovelProjectBlueprint,
  generateNovelReferencePack,
  generateNovelStoryBible,
  mergeNovelContinuityNotes,
} from '../../../../lib/ai/novels';
import { parseGeneratedPostDraft } from '../../../../lib/ai/openai-compatible';
import { generateCompatibleText } from '../../../../lib/ai/openai-generic';
import { collectWebResearch } from '../../../../lib/ai/web-search';
import { validatePostInput } from '../../../../lib/admin/validation';
import { requireAdminApiAuth } from '../../../../lib/auth/guards';
import {
  createNovelChapter,
  createNovelProject,
  getNovelProjectBySlug,
  replaceNovelReferenceSources,
  toNovelProjectInput,
  updateNovelProject,
} from '../../../../lib/novels/repository';
import { validateNovelProjectInput } from '../../../../lib/novels/validation';
import { createPost, getPostBySlug } from '../../../../lib/posts/repository';
import { getNovelChapterUrl } from '../../../../utils/novels';

type QuickstartPayload = {
  title?: string;
  concept?: string;
  referenceTitle?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  firstChapterStatus?: string;
  lengthPreset?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

async function buildUniqueNovelSlug(db: D1Database, desiredSlug: string) {
  let candidate = desiredSlug;
  let suffix = 2;

  while (await getNovelProjectBySlug(db, candidate)) {
    candidate = `${desiredSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function buildUniquePostSlug(db: D1Database, desiredSlug: string) {
  let candidate = desiredSlug;
  let suffix = 2;

  while (await getPostBySlug(db, candidate)) {
    candidate = `${desiredSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
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

function parseLengthPreset(value: unknown) {
  if (value === 'tight' || value === 'expanded') {
    return value;
  }

  return 'standard' as const;
}

export async function POST(context) {
  const unauthorized = await requireAdminApiAuth({
    cookies: context.cookies,
    env: context.locals.runtime?.env,
  });

  if (unauthorized) {
    return unauthorized;
  }

  let payload: QuickstartPayload;

  try {
    payload = await context.request.json();
  } catch {
    return json({ message: '请求体不是合法的 JSON。' }, 400);
  }

  const concept = String(payload.concept ?? '').trim();
  const title = String(payload.title ?? '').trim();
  const referenceTitle = String(payload.referenceTitle ?? '').trim();
  const baseUrl = String(payload.baseUrl ?? '').trim();
  const apiKey = String(payload.apiKey ?? '').trim();
  const model = String(payload.model ?? '').trim();
  const db = context.locals.runtime?.env?.DB;

  if (!db) {
    return json({ message: '当前环境缺少数据库绑定。' }, 500);
  }

  if (!concept) {
    return json({ message: '请至少提供一个创意描述。' }, 400);
  }

  if (!baseUrl || !apiKey || !model) {
    return json({ message: '请先填写 Base URL、API Key 和模型。' }, 400);
  }

  try {
    const blueprint = await generateNovelProjectBlueprint(baseUrl, apiKey, model, {
      title,
      concept,
      referenceTitle,
    });
    const uniqueProjectSlug = await buildUniqueNovelSlug(db, blueprint.slug);

    const validation = validateNovelProjectInput({
      slug: uniqueProjectSlug,
      title: blueprint.title,
      premise: blueprint.premise,
      genre: blueprint.genre,
      writingGoals: blueprint.writingGoals,
      referenceTitle: blueprint.referenceTitle || referenceTitle,
      referenceSummary: '',
      referenceNotes: '',
      worldBible: '',
      characterBible: '',
      outline: '',
      styleGuide: blueprint.styleGuide,
      continuityNotes: '',
      status: 'planning',
    });

    if (!validation.success) {
      return json({ message: validation.message, fieldErrors: validation.fieldErrors }, 400);
    }

    let project = await createNovelProject(db, validation.data);

    if (!project) {
      return json({ message: '小说项目创建失败，请稍后再试。' }, 500);
    }

    const query = buildNovelResearchQuery(project);
    let sources = [] as Awaited<ReturnType<typeof replaceNovelReferenceSources>>;

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
        project.id,
        research.sources.map((source) => ({
          title: source.title,
          url: source.url,
          snippet: source.snippet,
          excerpt: source.excerpt,
        })),
      );
    } catch (error) {
      console.error('[admin-novels-quickstart] research failed', error);
    }
    let pack = buildFallbackPack(sources);

    if (sources.length) {
      try {
        pack = await generateNovelReferencePack(baseUrl, apiKey, model, project, sources);
      } catch (error) {
        console.error('[admin-novels-quickstart] reference pack generation failed', error);
      }
    }

    project = await updateNovelProject(db, project.id, {
      ...toNovelProjectInput(project),
      referenceTitle: project.referenceTitle || referenceTitle || null,
      referenceSummary: pack.referenceSummary || null,
      referenceNotes: pack.referenceNotes || null,
    }) ?? project;

    let bible = {
      writingGoals: project.writingGoals,
      worldBible: project.worldBible,
      characterBible: project.characterBible,
      styleGuide: project.styleGuide,
    };

    try {
      bible = await generateNovelStoryBible(baseUrl, apiKey, model, { project });
    } catch (error) {
      console.error('[admin-novels-quickstart] story bible generation failed', error);
    }

    project = await updateNovelProject(db, project.id, {
      ...toNovelProjectInput(project),
      writingGoals: bible.writingGoals,
      worldBible: bible.worldBible,
      characterBible: bible.characterBible,
      styleGuide: bible.styleGuide,
    }) ?? project;

    let outline = project.outline;

    try {
      outline = await generateNovelOutline(baseUrl, apiKey, model, {
        project,
        targetVolumes: 3,
        chaptersPerVolume: 8,
      });
    } catch (error) {
      console.error('[admin-novels-quickstart] outline generation failed', error);
    }

    project = await updateNovelProject(db, project.id, {
      ...toNovelProjectInput(project),
      outline,
    }) ?? project;

    let firstChapterPlan = {
      chapterRole: '开篇切入',
      chapterTitleHint: '第一章',
      titleDirection: '主角切入型',
      chapterBrief: '请写出这部小说的第一章，完成主角出场、世界观切入和主线引爆，并让读者愿意继续看下去。',
      progressionChecklist: '',
      endingStrategy: '轻悬念',
      endingNote: '结尾留出主线即将正式展开的动力即可，不必强行夸张断章。',
    };

    try {
      firstChapterPlan = await generateNovelNextChapterPlan(baseUrl, apiKey, model, {
        project,
        chapters: [],
        sources,
        volumeNumber: 1,
        chapterNumber: 1,
      });
    } catch (error) {
      console.error('[admin-novels-quickstart] first chapter plan generation failed', error);
    }

    const rawChapterText = await generateCompatibleText(baseUrl, apiKey, model, {
      systemPrompt: [
        '你是专业的中文长篇网络小说协作作者。',
        '你的任务是输出第一章正文，而不是解释写作思路。',
        '必须严格返回 YAML Frontmatter + Markdown 正文，不要输出额外解释。',
      ].join('\n'),
      userPrompt: buildNovelChapterPrompt({
        project,
        chapters: [],
        sources,
        volumeNumber: 1,
        chapterNumber: 1,
        chapterBrief: firstChapterPlan.chapterBrief,
        chapterTitleHint: firstChapterPlan.chapterTitleHint,
        chapterRole: firstChapterPlan.chapterRole,
        titleDirection: firstChapterPlan.titleDirection,
        endingStrategy: firstChapterPlan.endingStrategy,
        endingNote: firstChapterPlan.endingNote,
        lengthPreset: parseLengthPreset(payload.lengthPreset),
      }),
      temperature: 0.82,
    });

    const generated = parseGeneratedPostDraft(
      rawChapterText,
      firstChapterPlan.chapterTitleHint || `${project.title} 第一章`,
    );
    const uniquePostSlug = await buildUniquePostSlug(db, generated.slug);
    const postValidation = validatePostInput({
      slug: uniquePostSlug,
      title: generated.title,
      description: generated.description,
      content: generated.content,
      tags: buildNovelPostTags(project, generated.tags).join(', '),
      cover: '',
      featured: '',
      status: payload.firstChapterStatus === 'published' ? 'published' : 'draft',
    });

    if (!postValidation.success) {
      return json({
        message: '项目已经自动创建，但第一章在保存前没有通过校验。',
        fieldErrors: postValidation.fieldErrors,
        project: {
          id: project.id,
          title: project.title,
          adminUrl: `/admin/novels/${project.id}`,
        },
      }, 409);
    }

    const post = await createPost(db, postValidation.data);

    if (!post) {
      return json({
        message: '项目已经自动创建，但第一章保存失败。',
        project: {
          id: project.id,
          title: project.title,
          adminUrl: `/admin/novels/${project.id}`,
        },
      }, 500);
    }

    let memoryUpdate = {
      summary: generated.description,
      continuityDelta: `- 第 1 章新增事件：${generated.description}`,
    };

    try {
      memoryUpdate = await generateNovelMemoryUpdate(baseUrl, apiKey, model, {
        project,
        volumeNumber: 1,
        chapterNumber: 1,
        chapterTitle: generated.title,
        chapterDescription: generated.description,
        chapterContent: generated.content,
      });
    } catch (error) {
      console.error('[admin-novels-quickstart] failed to update memory', error);
    }

    const chapter = await createNovelChapter(db, {
      projectId: project.id,
      volumeNumber: 1,
      chapterNumber: 1,
      title: generated.title,
      description: generated.description,
      brief: firstChapterPlan.chapterBrief,
      summary: memoryUpdate.summary,
      continuityDelta: memoryUpdate.continuityDelta,
      postId: post.id,
      postSlug: post.slug,
      status: post.status,
    });

    if (!chapter) {
      return json({
        message: '项目和首章文章已经创建，但章节记录写入失败，请到工作台确认。',
        project: {
          id: project.id,
          title: project.title,
          adminUrl: `/admin/novels/${project.id}`,
        },
        post: {
          id: post.id,
          title: post.title,
          adminUrl: `/admin/posts/${post.id}`,
        },
      }, 500);
    }

    project = await updateNovelProject(db, project.id, {
      ...toNovelProjectInput(project),
      status: 'serializing',
      continuityNotes: mergeNovelContinuityNotes(
        project.continuityNotes,
        1,
        1,
        generated.title,
        memoryUpdate.continuityDelta,
      ),
    }) ?? project;

    return json({
      message: '小说项目、设定、大纲和第一章已经自动生成。',
      query,
      project: {
        id: project.id,
        title: project.title,
        adminUrl: `/admin/novels/${project.id}`,
      },
      chapter: {
        id: chapter.id,
        title: chapter.title,
        volumeNumber: chapter.volumeNumber,
        chapterNumber: chapter.chapterNumber,
      },
      post: {
        id: post.id,
        title: post.title,
        status: post.status,
        adminUrl: `/admin/posts/${post.id}`,
        publicUrl: post.status === 'published'
          ? getNovelChapterUrl(project.slug, chapter.volumeNumber, chapter.chapterNumber)
          : null,
      },
    });
  } catch (error) {
    return json({
      message: error instanceof Error ? error.message : '自动建书失败，请稍后再试。',
    }, 500);
  }
}
