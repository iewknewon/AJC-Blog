import { generateLearningContinuationOutline } from '../../../../../lib/ai/learning';
import { requireAdminApiAuth } from '../../../../../lib/auth/guards';
import {
  buildContinuationBlueprint,
  buildContinuationPlanItems,
  coerceContinuationCount,
} from '../../../../../lib/learning/continuation';
import { getLearningTrackById } from '../../../../../lib/learning/repository';

type ContinuationPlanPayload = {
  direction?: string;
  count?: number;
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

  const db = context.locals.runtime?.env?.DB;
  const { id } = context.params;

  if (!db || !id) {
    return json({ message: 'Learning continuation is unavailable in this environment.' }, 500);
  }

  let payload: ContinuationPlanPayload;

  try {
    payload = await context.request.json();
  } catch {
    return json({ message: 'Invalid JSON payload.' }, 400);
  }

  const direction = String(payload.direction ?? '').trim();
  const baseUrl = String(payload.baseUrl ?? '').trim();
  const apiKey = String(payload.apiKey ?? '').trim();
  const model = String(payload.model ?? '').trim();
  const count = coerceContinuationCount(payload.count);

  if (!direction || !baseUrl || !apiKey || !model) {
    return json({ message: 'Direction, Base URL, API Key, and model are required.' }, 400);
  }

  const track = await getLearningTrackById(db, id);

  if (!track) {
    return json({ message: 'Learning track not found.' }, 404);
  }

  if (track.lessons.length === 0) {
    return json({ message: 'Add at least one lesson before generating continuation.' }, 409);
  }

  const sortedLessons = [...track.lessons].sort((left, right) => left.order - right.order);
  const outline = await generateLearningContinuationOutline(baseUrl, apiKey, model, {
    direction,
    count,
    blueprint: buildContinuationBlueprint(track),
    existingLessons: sortedLessons.map((lesson) => ({
      order: lesson.order,
      lessonSlug: lesson.lessonSlug,
      title: lesson.title,
      description: lesson.description,
    })),
  });
  const plans = buildContinuationPlanItems(track, outline.lessons.slice(0, count));

  return json({
    track: {
      id: track.id,
      slug: track.slug,
      title: track.title,
    },
    direction,
    startingOrder: plans[0]?.order ?? (sortedLessons.at(-1)?.order ?? 0) + 1,
    plans,
  });
}
