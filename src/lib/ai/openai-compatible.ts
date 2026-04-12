type ProviderErrorShape = {
  error?: {
    message?: string;
  };
};

type ProviderModelShape = {
  id?: string;
  owned_by?: string;
  created?: number;
};

type ProviderModelsResponse = {
  data?: ProviderModelShape[];
};

type ChatCompletionTextPart = {
  text?: string;
};

type ChatCompletionMessage = {
  content?: string | ChatCompletionTextPart[];
};

type ChatCompletionChoice = {
  message?: ChatCompletionMessage;
};

type ChatCompletionResponse = {
  choices?: ChatCompletionChoice[];
};

export type ProviderModel = {
  id: string;
  ownedBy?: string;
  created?: number;
};

export type GeneratePostRequest = {
  topic: string;
  keywords?: string;
  audience?: string;
  requirements?: string;
};

export type GeneratedPostDraft = {
  title: string;
  slug: string;
  description: string;
  tags: string[];
  content: string;
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '');
}

function buildProviderUrl(baseUrl: string, path: string) {
  return `${normalizeBaseUrl(baseUrl)}${path.startsWith('/') ? path : `/${path}`}`;
}

async function parseProviderError(response: Response) {
  const fallbackMessage = `请求 AI 服务失败（HTTP ${response.status}）`;

  try {
    const data = await response.json() as ProviderErrorShape;
    return data.error?.message?.trim() || fallbackMessage;
  } catch {
    const text = await response.text();
    return text.trim() || fallbackMessage;
  }
}

function extractTextContent(content: ChatCompletionMessage['content']) {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content.map((item) => item?.text ?? '').join('').trim();
}

function extractJsonBlock(text: string) {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) ?? text.match(/```\s*([\s\S]*?)\s*```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1).trim();
  }

  return text.trim();
}

export function slugifyTitle(input: string) {
  const normalized = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || `ai-post-${crypto.randomUUID().slice(0, 8)}`;
}

export function parseGeneratedPostDraft(rawText: string, fallbackTopic: string): GeneratedPostDraft {
  const jsonText = extractJsonBlock(rawText);
  const parsed = JSON.parse(jsonText) as Partial<GeneratedPostDraft>;
  const title = String(parsed.title ?? fallbackTopic).trim();
  const description = String(parsed.description ?? '').trim();
  const content = String(parsed.content ?? '').trim();
  const tags = Array.isArray(parsed.tags)
    ? [...new Set(parsed.tags.map((tag) => String(tag).trim()).filter(Boolean))]
    : [];
  const slugSource = String(parsed.slug ?? title).trim();

  if (!title || !description || !content || tags.length === 0) {
    throw new Error('AI 返回的文章结构不完整，请调整提示词后重试。');
  }

  return {
    title,
    slug: slugifyTitle(slugSource),
    description,
    tags,
    content,
  };
}

function buildWriterPrompt(input: GeneratePostRequest) {
  return [
    '请基于以下要求生成一篇适合技术博客发布的 Markdown 文章，并且只返回 JSON 对象。',
    'JSON 必须包含字段：title、slug、description、tags、content。',
    '要求：',
    `- 文章主题：${input.topic.trim()}`,
    `- 目标读者：${input.audience?.trim() || '默认技术博客读者'}`,
    `- 关键词倾向：${input.keywords?.trim() || '无特别要求'}`,
    `- 额外要求：${input.requirements?.trim() || '请保持结构清晰、可直接发布'}`,
    '- slug 必须是英文小写短横线格式。',
    '- description 需要是简洁摘要。',
    '- tags 必须是字符串数组，至少 2 个。',
    '- content 必须是完整 Markdown 正文，正文首行使用一级标题。',
    '- 默认使用中文写作，除非要求里明确指定其他语言。',
  ].join('\n');
}

export async function listCompatibleModels(baseUrl: string, apiKey: string): Promise<ProviderModel[]> {
  const response = await fetch(buildProviderUrl(baseUrl, '/models'), {
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
    },
  });

  if (!response.ok) {
    throw new Error(await parseProviderError(response));
  }

  const data = await response.json() as ProviderModelsResponse;

  return (data.data ?? [])
    .filter((model): model is ProviderModelShape & { id: string } => typeof model.id === 'string' && model.id.trim().length > 0)
    .map((model) => ({
      id: model.id,
      ownedBy: model.owned_by,
      created: model.created,
    }))
    .sort((left, right) => left.id.localeCompare(right.id, 'en'));
}

export async function generateCompatiblePost(
  baseUrl: string,
  apiKey: string,
  model: string,
  input: GeneratePostRequest,
): Promise<GeneratedPostDraft> {
  const response = await fetch(buildProviderUrl(baseUrl, '/chat/completions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: '你是一名资深技术博客作者。你必须严格返回一个 JSON 对象，不能输出 JSON 以外的解释。',
        },
        {
          role: 'user',
          content: buildWriterPrompt(input),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(await parseProviderError(response));
  }

  const data = await response.json() as ChatCompletionResponse;
  const rawText = extractTextContent(data.choices?.[0]?.message?.content);

  if (!rawText) {
    throw new Error('AI 服务没有返回可解析的正文内容。');
  }

  return parseGeneratedPostDraft(rawText, input.topic);
}
