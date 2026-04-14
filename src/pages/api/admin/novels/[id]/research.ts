import { buildNovelResearchQuery, generateNovelReferencePack } from '../../../../../lib/ai/novels';
import { collectWebResearch } from '../../../../../lib/ai/web-search';
import { requireAdminApiAuth } from '../../../../../lib/auth/guards';
import {
  getNovelProjectById,
  replaceNovelReferenceSources,
  toNovelProjectInput,
  updateNovelProject,
} from '../../../../../lib/novels/repository';
import { validateNovelProjectInput } from '../../../../../lib/novels/validation';

type ResearchPayload = {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  query?: string;
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

  const db = context.locals.runtime.env.DB;
  const existingProject = await getNovelProjectById(db, id);

  if (!existingProject) {
    return json({ message: '没有找到对应的小说项目。' }, 404);
  }

  let payload: ResearchPayload;

  try {
    payload = await context.request.json();
  } catch {
    return json({ message: '请求体不是合法的 JSON。' }, 400);
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
  const query = String(payload.query ?? '').trim() || buildNovelResearchQuery(project);

  if (!query) {
    return json({ message: '请先填写参考作品或项目标题。' }, 400);
  }

  const baseUrl = String(payload.baseUrl ?? '').trim();
  const apiKey = String(payload.apiKey ?? '').trim();
  const model = String(payload.model ?? '').trim();
  const research = await collectWebResearch(query, {
    searchLimit: 6,
    pageFetchLimit: 4,
    baseUrl,
    apiKey,
    model,
    mode: 'auto',
  });

  const sources = await replaceNovelReferenceSources(
    db,
    id,
    research.sources.map((source) => ({
      title: source.title,
      url: source.url,
      snippet: source.snippet,
      excerpt: source.excerpt,
    })),
  );

  const pack = sources.length && baseUrl && apiKey && model
    ? await generateNovelReferencePack(baseUrl, apiKey, model, project, sources)
    : buildFallbackPack(sources);

  project = await updateNovelProject(db, id, {
    ...toNovelProjectInput(project),
    referenceSummary: pack.referenceSummary || project.referenceSummary || null,
    referenceNotes: pack.referenceNotes || project.referenceNotes || null,
  }) ?? project;

  return json({
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
      ? `已通过${research.strategyLabel}整理 ${sources.length} 条公开资料，并更新参考概览。`
      : '没有检索到足够稳定的公开资料，请换一个更明确的参考作品名再试。',
  });
}
