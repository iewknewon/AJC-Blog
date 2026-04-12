import { requireAdminApiAuth } from '../../../../lib/auth/guards';
import { generateCoverSearchQueries } from '../../../../lib/ai/openai-compatible';
import { suggestCoverCandidatesFromContent } from '../../../../lib/covers/suggestions';

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
    aiBaseUrl?: string;
    aiApiKey?: string;
    aiModel?: string;
  };

  try {
    payload = await context.request.json();
  } catch {
    return json({ message: '请求格式错误，请重新加载页面后重试。' }, 400);
  }

  let suggestions = [];
  let preferredQueries: string[] = [];
  const aiBaseUrl = String(payload.aiBaseUrl ?? '').trim();
  const aiApiKey = String(payload.aiApiKey ?? '').trim();
  const aiModel = String(payload.aiModel ?? '').trim();

  if (aiBaseUrl && aiApiKey && aiModel) {
    try {
      preferredQueries = await generateCoverSearchQueries(aiBaseUrl, aiApiKey, aiModel, {
        title: payload.title,
        description: payload.description,
        tags: String(payload.tags ?? '').split(/[，,]/).map((item) => item.trim()).filter(Boolean),
        content: payload.content,
      });
    } catch {
      preferredQueries = [];
    }
  }

  try {
    suggestions = await suggestCoverCandidatesFromContent({
      title: payload.title,
      description: payload.description,
      tags: payload.tags,
      content: payload.content,
    }, {
      preferredQueries,
      limit: 3,
    });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : '封面检索失败，请稍后重试。' }, 502);
  }

  if (!suggestions.length) {
    return json({ message: preferredQueries.length
      ? '已经结合整篇内容生成了检索词，但当前图库里仍没有找到足够合适的封面。你可以补充更具体的场景描述后再试。'
      : '暂时没有找到足够合适的封面。当前会优先用关键词检索；如果你已经配置 AI 写作模型，后续会更适合做整篇内容理解匹配。' }, 404);
  }

  const suggestion = suggestions[0];

  return json({
    suggestion,
    suggestions,
    message: suggestion.queryMode === 'ai'
      ? `已根据整篇内容生成检索意图，并找到了 ${suggestions.length} 张候选封面。`
      : `已根据标题、标签和正文关键词找到了 ${suggestions.length} 张候选封面。`,
  });
}
