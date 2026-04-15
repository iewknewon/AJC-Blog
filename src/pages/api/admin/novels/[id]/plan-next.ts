import { generateNovelNextChapterPlan } from '../../../../../lib/ai/novels';
import { requireAdminApiAuth } from '../../../../../lib/auth/guards';
import {
  getNovelChaptersByProjectId,
  getNovelProjectById,
  getNovelReferenceSources,
  toNovelProjectInput,
  updateNovelProject,
} from '../../../../../lib/novels/repository';
import { validateNovelProjectInput } from '../../../../../lib/novels/validation';

type PlanPayload = {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  volumeNumber?: number;
  chapterNumber?: number;
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

function parsePositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.round(parsed);
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

  let payload: PlanPayload;

  try {
    payload = await context.request.json();
  } catch {
    return json({ message: '请求体不是合法的 JSON。' }, 400);
  }

  const baseUrl = String(payload.baseUrl ?? '').trim();
  const apiKey = String(payload.apiKey ?? '').trim();
  const model = String(payload.model ?? '').trim();

  if (!baseUrl || !apiKey || !model) {
    return json({ message: '请先填写 Base URL、API Key 和模型。' }, 400);
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

  const project = await updateNovelProject(db, id, validation.data) ?? existingProject;
  const chapters = await getNovelChaptersByProjectId(db, id);
  const sources = await getNovelReferenceSources(db, id);
  const volumeNumber = parsePositiveInteger(payload.volumeNumber, Math.max(1, project.lastVolumeNumber || 1));
  const chapterNumber = parsePositiveInteger(payload.chapterNumber, Math.max(1, project.lastChapterNumber + 1 || 1));
  let plan;

  try {
    plan = await generateNovelNextChapterPlan(baseUrl, apiKey, model, {
      project,
      chapters,
      sources,
      volumeNumber,
      chapterNumber,
    });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : '生成下一章任务卡失败。' }, 502);
  }

  return json({
    ...plan,
    volumeNumber,
    chapterNumber,
    message: `第 ${chapterNumber} 章任务卡已经生成。`,
  });
}
