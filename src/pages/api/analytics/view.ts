import {
  getPageViewInputFromRequest,
  normalizeTrackedPath,
  recordPageView,
} from '../../../lib/analytics/repository';

export async function POST(context) {
  let payload: { path?: string } | null = null;

  try {
    payload = await context.request.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  const rawPath = typeof payload?.path === 'string' ? payload.path : '';
  const path = normalizeTrackedPath(rawPath, context.request.url);

  if (!path) {
    return new Response(null, { status: 204 });
  }

  try {
    const pageView = await getPageViewInputFromRequest(context.request, path);
    await recordPageView(context.locals.runtime.env.DB, pageView);
  } catch (error) {
    console.error('Failed to record page view', error);
  }

  return new Response(null, { status: 204 });
}
