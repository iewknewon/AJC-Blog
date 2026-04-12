import { requireAdminApiAuth } from '../../../../lib/auth/guards';
import { suggestCoverFromContent } from '../../../../lib/covers/suggestions';

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

  let payload: {
    title?: string;
    description?: string;
    tags?: string;
    content?: string;
  };

  try {
    payload = await context.request.json();
  } catch {
    return json({ message: '请求格式错误，请重新加载页面后重试。' }, 400);
  }

  let suggestion;

  try {
    suggestion = await suggestCoverFromContent({
      title: payload.title,
      description: payload.description,
      tags: payload.tags,
      content: payload.content,
    });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : '封面检索失败，请稍后重试。' }, 502);
  }

  if (!suggestion) {
    return json({ message: '暂时没有找到足够合适的封面，建议补充更明确的标题或英文标签后再试。' }, 404);
  }

  return json({ suggestion });
}
