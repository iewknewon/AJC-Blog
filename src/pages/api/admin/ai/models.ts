import { requireAdminApiAuth } from '../../../../lib/auth/guards';
import { listCompatibleModels } from '../../../../lib/ai/openai-compatible';

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

  let payload: { baseUrl?: string; apiKey?: string };

  try {
    payload = await context.request.json();
  } catch {
    return json({ message: '请求格式错误，请重新加载页面后重试。' }, 400);
  }

  const baseUrl = String(payload.baseUrl ?? '').trim();
  const apiKey = String(payload.apiKey ?? '').trim();

  if (!baseUrl || !apiKey) {
    return json({ message: '请先填写 Base URL 和 API Key。' }, 400);
  }

  try {
    const models = await listCompatibleModels(baseUrl, apiKey);
    return json({ models });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : '加载模型失败，请检查配置。' }, 502);
  }
}
