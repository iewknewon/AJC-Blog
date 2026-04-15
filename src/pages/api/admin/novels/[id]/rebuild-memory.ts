import { buildNovelContinuityNotesFromChapters, generateNovelMemoryUpdate, mergeNovelContinuityNotes } from '../../../../../lib/ai/novels';
import { requireAdminApiAuth } from '../../../../../lib/auth/guards';
import {
  getNovelChaptersByProjectId,
  getNovelProjectById,
  rebuildNovelProjectContinuityNotes,
  toNovelProjectInput,
  updateNovelChapterMemory,
  updateNovelProject,
} from '../../../../../lib/novels/repository';
import { getPostById } from '../../../../../lib/posts/repository';

type RebuildPayload = {
  mode?: 'quick' | 'deep';
  baseUrl?: string;
  apiKey?: string;
  model?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
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
  const project = await getNovelProjectById(db, id);

  if (!project) {
    return json({ message: '没有找到对应的小说项目。' }, 404);
  }

  let payload: RebuildPayload = {};

  try {
    payload = await context.request.json();
  } catch {
    payload = {};
  }

  const mode = payload.mode === 'deep' ? 'deep' : 'quick';

  if (mode === 'quick') {
    const updatedProject = await rebuildNovelProjectContinuityNotes(db, id);

    return json({
      continuityNotes: updatedProject?.continuityNotes ?? '',
      chaptersCount: updatedProject?.chaptersCount ?? project.chaptersCount,
      rebuiltChapters: updatedProject?.chaptersCount ?? project.chaptersCount,
      mode,
      message: updatedProject?.continuityNotes
        ? '已根据当前章节记录快速重建全书连续记忆。'
        : '当前还没有可用于重建的章节记录，连续记忆已清空。',
    });
  }

  const baseUrl = String(payload.baseUrl ?? '').trim();
  const apiKey = String(payload.apiKey ?? '').trim();
  const model = String(payload.model ?? '').trim();

  if (!baseUrl || !apiKey || !model) {
    return json({ message: '深度重建需要先填写 Base URL、API Key 和模型。' }, 400);
  }

  const chapters = await getNovelChaptersByProjectId(db, id);

  if (!chapters.length) {
    const updatedProject = await updateNovelProject(db, id, {
      ...toNovelProjectInput(project),
      continuityNotes: '',
    });

    return json({
      continuityNotes: updatedProject?.continuityNotes ?? '',
      chaptersCount: 0,
      rebuiltChapters: 0,
      mode,
      message: '当前还没有章节，已清空连续记忆。',
    });
  }

  const orderedChapters = [...chapters]
    .sort((left, right) => left.volumeNumber - right.volumeNumber || left.chapterNumber - right.chapterNumber);

  let workingContinuityNotes = '';
  let rebuiltCount = 0;

  for (const chapter of orderedChapters) {
    const post = chapter.postId ? await getPostById(db, chapter.postId) : null;

    if (!post) {
      const fallbackSummary = chapter.summary || chapter.description;
      const fallbackDelta = chapter.continuityDelta || `- 当前章节摘要：${fallbackSummary}`;

      workingContinuityNotes = mergeNovelContinuityNotes(
        workingContinuityNotes,
        chapter.volumeNumber,
        chapter.chapterNumber,
        chapter.title,
        fallbackDelta,
      );
      rebuiltCount += 1;
      continue;
    }

    let memoryUpdate = {
      summary: chapter.summary || post.description,
      continuityDelta: chapter.continuityDelta || `- 当前章节摘要：${post.description}`,
    };

    try {
      memoryUpdate = await generateNovelMemoryUpdate(baseUrl, apiKey, model, {
        project: {
          ...project,
          continuityNotes: workingContinuityNotes,
        },
        volumeNumber: chapter.volumeNumber,
        chapterNumber: chapter.chapterNumber,
        chapterTitle: post.title,
        chapterDescription: post.description,
        chapterContent: post.content,
      });
    } catch (error) {
      console.error('[admin-novels-rebuild-memory] deep memory regeneration failed for chapter', chapter.id, error);
    }

    await updateNovelChapterMemory(db, chapter.id, {
      title: post.title,
      description: post.description,
      summary: memoryUpdate.summary,
      continuityDelta: memoryUpdate.continuityDelta,
    });

    workingContinuityNotes = mergeNovelContinuityNotes(
      workingContinuityNotes,
      chapter.volumeNumber,
      chapter.chapterNumber,
      post.title,
      memoryUpdate.continuityDelta,
    );
    rebuiltCount += 1;
  }

  const refreshedChapters = await getNovelChaptersByProjectId(db, id);
  const normalizedContinuity = workingContinuityNotes || buildNovelContinuityNotesFromChapters(refreshedChapters);
  const updatedProject = await updateNovelProject(db, id, {
    ...toNovelProjectInput(project),
    continuityNotes: normalizedContinuity,
  });

  return json({
    continuityNotes: updatedProject?.continuityNotes ?? normalizedContinuity,
    chaptersCount: refreshedChapters.length,
    rebuiltChapters: rebuiltCount,
    mode,
    message: `已基于当前章节正文深度重建连续记忆，并刷新了 ${rebuiltCount} 个章节的摘要与记忆增量。`,
  });
}
