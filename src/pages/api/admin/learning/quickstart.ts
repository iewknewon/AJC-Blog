import {
  generateLearningLessonDraft,
  generateLearningLessonOutline,
  generateLearningTrackBlueprint,
} from '../../../../lib/ai/learning';
import { slugifyTitle } from '../../../../lib/ai/openai-compatible';
import { requireAdminApiAuth } from '../../../../lib/auth/guards';
import {
  createLearningLesson,
  createLearningTrack,
  getLearningTrackBySlug,
} from '../../../../lib/learning/repository';
import { validateLearningLessonInput, validateLearningTrackInput } from '../../../../lib/learning/validation';

type QuickstartPayload = {
  title?: string;
  prompt?: string;
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

async function buildUniqueTrackSlug(db: D1Database, desiredSlug: string) {
  const baseSlug = slugifyTitle(desiredSlug);
  let candidate = baseSlug;
  let suffix = 2;

  while (await getLearningTrackBySlug(db, candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function buildComposedPrompt(title: string, prompt: string) {
  if (title && prompt) {
    return `专题标题：${title}\n学习需求：${prompt}`;
  }

  return title || prompt;
}

function buildUniqueLessonSlug(desiredSlug: string, seen: Set<string>) {
  const baseSlug = slugifyTitle(desiredSlug);
  let candidate = baseSlug;
  let suffix = 2;

  while (seen.has(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  seen.add(candidate);
  return candidate;
}

function buildFallbackRelatedLessonSlugs(allLessonSlugs: string[], lessonSlug: string, relatedLessonSlugs: string[]) {
  const knownSlugs = new Set(allLessonSlugs);
  const normalized = relatedLessonSlugs.filter((slug) => slug !== lessonSlug && knownSlugs.has(slug));

  if (normalized.length > 0) {
    return normalized;
  }

  const index = allLessonSlugs.findIndex((slug) => slug === lessonSlug);
  const neighbors = [
    index > 0 ? allLessonSlugs[index - 1] : null,
    index >= 0 && index < allLessonSlugs.length - 1 ? allLessonSlugs[index + 1] : null,
  ].filter((slug): slug is string => Boolean(slug));

  return neighbors;
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
    return json({ message: 'Invalid JSON payload.' }, 400);
  }

  const title = String(payload.title ?? '').trim();
  const prompt = String(payload.prompt ?? '').trim();
  const baseUrl = String(payload.baseUrl ?? '').trim();
  const apiKey = String(payload.apiKey ?? '').trim();
  const model = String(payload.model ?? '').trim();
  const db = context.locals.runtime?.env?.DB;

  if (!db) {
    return json({ message: 'Learning CMS database is not available in this environment.' }, 500);
  }

  if (!prompt && !title) {
    return json({ message: 'Provide at least a title or a prompt for the learning track.' }, 400);
  }

  if (!baseUrl || !apiKey || !model) {
    return json({ message: 'Base URL, API Key, and model are required for quickstart.' }, 400);
  }

  const composedPrompt = buildComposedPrompt(title, prompt);

  try {
    const blueprint = await generateLearningTrackBlueprint(baseUrl, apiKey, model, {
      prompt: composedPrompt,
    });
    const uniqueTrackSlug = await buildUniqueTrackSlug(db, blueprint.slug || title || prompt);
    const trackValidation = validateLearningTrackInput({
      ...blueprint,
      slug: uniqueTrackSlug,
      sourcePrompt: composedPrompt,
      status: 'draft',
    });

    if (!trackValidation.success) {
      return json({
        message: trackValidation.message,
        fieldErrors: trackValidation.fieldErrors,
      }, 400);
    }

    const track = await createLearningTrack(db, trackValidation.data);

    if (!track) {
      return json({ message: 'Failed to create the learning track.' }, 500);
    }

    const outline = await generateLearningLessonOutline(baseUrl, apiKey, model, {
      prompt: composedPrompt,
      blueprint,
    });
    const usedLessonSlugs = new Set<string>();
    const normalizedOutline = outline.lessons.map((lesson, index) => ({
      ...lesson,
      order: index + 1,
      lessonSlug: buildUniqueLessonSlug(lesson.lessonSlug || lesson.title, usedLessonSlugs),
    }));
    const allLessonSlugs = normalizedOutline.map((lesson) => lesson.lessonSlug);
    const createdLessons = [] as Array<{ id: string; title: string; lessonSlug: string }>;

    for (const lesson of normalizedOutline) {
      const draft = await generateLearningLessonDraft(baseUrl, apiKey, model, {
        prompt: composedPrompt,
        blueprint,
        outline: lesson,
      });
      const lessonValidation = validateLearningLessonInput({
        trackId: track.id,
        lessonSlug: lesson.lessonSlug,
        title: lesson.title,
        description: lesson.description,
        order: lesson.order,
        estimatedMinutes: lesson.estimatedMinutes,
        objectives: lesson.objectives,
        keywords: lesson.keywords,
        chatContextSummary: lesson.chatContextSummary,
        relatedLessonSlugs: buildFallbackRelatedLessonSlugs(allLessonSlugs, lesson.lessonSlug, draft.relatedLessonSlugs),
        animation: lesson.animation,
        heroSummary: lesson.heroSummary,
        sections: draft.sections,
        misconceptions: draft.misconceptions,
        quiz: draft.quiz,
        quickPrompts: lesson.quickPrompts,
        status: 'draft',
      });

      if (!lessonValidation.success) {
        return json({
          message: `Track created, but lesson validation failed for "${lesson.title}".`,
          fieldErrors: lessonValidation.fieldErrors,
          track: {
            id: track.id,
            title: track.title,
            adminUrl: `/admin/learning/${track.id}`,
          },
        }, 409);
      }

      const createdLesson = await createLearningLesson(db, lessonValidation.data);

      if (!createdLesson) {
        return json({
          message: `Track created, but failed to save lesson "${lesson.title}".`,
          track: {
            id: track.id,
            title: track.title,
            adminUrl: `/admin/learning/${track.id}`,
          },
        }, 500);
      }

      createdLessons.push({
        id: createdLesson.id,
        title: createdLesson.title,
        lessonSlug: createdLesson.lessonSlug,
      });
    }

    return json({
      message: `Learning track created with ${createdLessons.length} draft lessons.`,
      track: {
        id: track.id,
        title: track.title,
        slug: track.slug,
        adminUrl: `/admin/learning/${track.id}`,
      },
      lessons: createdLessons,
    });
  } catch (error) {
    return json({
      message: error instanceof Error ? error.message : 'Learning quickstart failed unexpectedly.',
    }, 500);
  }
}
