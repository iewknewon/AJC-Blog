import { generateLearningLessonDraft } from '../../../../../lib/ai/learning';
import { requireAdminApiAuth } from '../../../../../lib/auth/guards';
import {
  buildContinuationBlueprint,
  buildFallbackContinuationRelatedLessonSlugs,
} from '../../../../../lib/learning/continuation';
import { createLearningLesson, getLearningTrackById } from '../../../../../lib/learning/repository';
import type { LearningContinuationPlanItem } from '../../../../../lib/learning/types';
import { validateLearningLessonInput } from '../../../../../lib/learning/validation';

type ContinuationDraftPayload = {
  direction?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  plans?: LearningContinuationPlanItem[];
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

  const db = context.locals.runtime?.env?.DB;
  const { id } = context.params;

  if (!db || !id) {
    return json({ message: 'Learning continuation is unavailable in this environment.' }, 500);
  }

  let payload: ContinuationDraftPayload;

  try {
    payload = await context.request.json();
  } catch {
    return json({ message: 'Invalid JSON payload.' }, 400);
  }

  const direction = String(payload.direction ?? '').trim();
  const baseUrl = String(payload.baseUrl ?? '').trim();
  const apiKey = String(payload.apiKey ?? '').trim();
  const model = String(payload.model ?? '').trim();
  const plans = Array.isArray(payload.plans) ? payload.plans.slice(0, 3) : [];

  if (!direction || !baseUrl || !apiKey || !model || plans.length === 0) {
    return json({ message: 'Direction, AI config, and at least one plan item are required.' }, 400);
  }

  const track = await getLearningTrackById(db, id);

  if (!track) {
    return json({ message: 'Learning track not found.' }, 404);
  }

  const blueprint = buildContinuationBlueprint(track);
  const existingSlugs = [...track.lessons]
    .sort((left, right) => left.order - right.order)
    .map((lesson) => lesson.lessonSlug);
  const allKnownSlugs = [...existingSlugs, ...plans.map((plan) => plan.lessonSlug)];
  const created: Array<{ id: string; title: string; adminUrl: string }> = [];
  const failed: Array<{ order: number; title: string; reason: string }> = [];

  for (const plan of plans) {
    try {
      const draft = await generateLearningLessonDraft(baseUrl, apiKey, model, {
        prompt: direction,
        blueprint,
        outline: plan,
      });
      const validation = validateLearningLessonInput({
        trackId: track.id,
        lessonSlug: plan.lessonSlug,
        title: plan.title,
        description: plan.description,
        order: plan.order,
        estimatedMinutes: plan.estimatedMinutes,
        objectives: plan.objectives,
        keywords: plan.keywords,
        chatContextSummary: plan.chatContextSummary,
        relatedLessonSlugs: buildFallbackContinuationRelatedLessonSlugs(
          allKnownSlugs,
          plan.lessonSlug,
          draft.relatedLessonSlugs,
        ),
        animation: plan.animation,
        heroSummary: plan.heroSummary,
        sections: draft.sections,
        misconceptions: draft.misconceptions,
        quiz: draft.quiz,
        quickPrompts: plan.quickPrompts,
        status: 'draft',
      });

      if (!validation.success) {
        failed.push({
          order: plan.order,
          title: plan.title,
          reason: validation.message,
        });
        continue;
      }

      const lesson = await createLearningLesson(db, validation.data);

      if (!lesson) {
        failed.push({
          order: plan.order,
          title: plan.title,
          reason: 'Lesson persistence failed.',
        });
        continue;
      }

      created.push({
        id: lesson.id,
        title: lesson.title,
        adminUrl: `/admin/learning/${track.id}/lessons/${lesson.id}`,
      });
      existingSlugs.push(lesson.lessonSlug);
    } catch (error) {
      failed.push({
        order: plan.order,
        title: plan.title,
        reason: error instanceof Error ? error.message : 'Draft generation failed unexpectedly.',
      });
    }
  }

  return json({
    message: failed.length > 0
      ? `Generated ${created.length} draft lessons, ${failed.length} failed.`
      : `Generated ${created.length} draft lessons.`,
    created,
    failed,
  });
}
