import type { WebResearchContext } from './web-search';

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
  delta?: {
    content?: string | ChatCompletionTextPart[];
  };
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
  customPrompt?: string;
  systemPrompt?: string;
  webResearch?: WebResearchContext | null;
};

export type CoverQueryRequest = {
  title?: string;
  description?: string;
  tags?: string[];
  content?: string;
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

function extractFrontmatterDraft(rawText: string, fallbackTopic: string): GeneratedPostDraft | null {
  const trimmed = rawText.trim();

  if (!trimmed.startsWith('---')) {
    return null;
  }

  const frontmatterMatch = trimmed.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);

  if (!frontmatterMatch) {
    throw new Error('AI 返回的 Frontmatter 格式不正确，请调整提示词后重试。');
  }

  const [, frontmatterBlock, contentBlock] = frontmatterMatch;
  const metadata: Record<string, string | string[]> = {};
  let currentArrayKey: string | null = null;

  for (const line of frontmatterBlock.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      continue;
    }

    const arrayItemMatch = trimmedLine.match(/^-\s+(.*)$/);

    if (arrayItemMatch && currentArrayKey) {
      const existing = Array.isArray(metadata[currentArrayKey]) ? metadata[currentArrayKey] : [];
      metadata[currentArrayKey] = [...existing, arrayItemMatch[1].trim()];
      continue;
    }

    const keyValueMatch = trimmedLine.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

    if (!keyValueMatch) {
      continue;
    }

    const [, key, value] = keyValueMatch;

    if (!value) {
      currentArrayKey = key;
      metadata[key] = [];
      continue;
    }

    currentArrayKey = null;
    metadata[key] = value.trim();
  }

  const title = String(metadata.title ?? fallbackTopic).trim();
  const description = String(metadata.description ?? '').trim();
  const tags = Array.isArray(metadata.tags)
    ? [...new Set(metadata.tags.map((tag) => String(tag).trim()).filter(Boolean))]
    : [];
  const slugSource = String(metadata.slug ?? title).trim();
  const content = contentBlock.trim();

  if (!title || !description || !content || tags.length === 0) {
    throw new Error('AI 返回的 Markdown Frontmatter 不完整，请调整提示词后重试。');
  }

  return {
    title,
    slug: slugifyTitle(slugSource),
    description,
    tags,
    content,
  };
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
  const frontmatterDraft = extractFrontmatterDraft(rawText, fallbackTopic);

  if (frontmatterDraft) {
    return frontmatterDraft;
  }

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

function trimPromptText(input: string, limit: number) {
  const normalized = input.replace(/\s+/g, ' ').trim();

  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

function appendWebResearchSections(sections: string[], webResearch?: WebResearchContext | null) {
  if (!webResearch?.sources?.length) {
    return;
  }

  sections.push('以下是本次联网检索得到的参考资料，请优先依据这些资料写作，不要虚构未检索到的事实：');
  sections.push(`- 联网检索词：${webResearch.query}`);

  webResearch.sources.slice(0, 4).forEach((source, index) => {
    sections.push(`资料 ${index + 1}：`);
    sections.push(`- 标题：${trimPromptText(source.title, 120)}`);
    sections.push(`- 链接：${source.url}`);

    if (source.snippet) {
      sections.push(`- 搜索摘要：${trimPromptText(source.snippet, 240)}`);
    }

    if (source.excerpt) {
      sections.push(`- 网页摘录：${trimPromptText(source.excerpt, 600)}`);
    }
  });

  sections.push('若正文确实使用了上述资料，请在文章末尾增加“参考链接”小节，并只列出真正使用到的链接。');
}

export function buildWriterPrompt(input: GeneratePostRequest) {
  const sections = [
    '请基于以下要求生成一篇适合技术博客发布的 Markdown 文章。',
    '请严格输出 YAML Frontmatter + Markdown 正文，不要输出解释文字。',
    'Frontmatter 必须包含：title、slug、description、tags。',
    '输出格式示例：',
    '---',
    'title: 示例标题',
    'slug: sample-slug',
    'description: 一句话摘要',
    'tags:',
    '  - Astro',
    '  - Cloudflare',
    '---',
    '# 示例标题',
    '',
    '这里开始正文。',
    '要求：',
    `- 文章主题：${input.topic.trim()}`,
    `- 目标读者：${input.audience?.trim() || '默认技术博客读者'}`,
    `- 关键词倾向：${input.keywords?.trim() || '无特别要求'}`,
    `- 额外要求：${input.requirements?.trim() || '请保持结构清晰、可直接发布'}`,
    '- slug 必须是英文小写短横线格式。',
    '- description 需要是简洁摘要。',
    '- tags 至少 2 个。',
    '- Markdown 正文首行使用一级标题。',
    '- 默认使用中文写作，除非要求里明确指定其他语言。',
  ];

  appendWebResearchSections(sections, input.webResearch);

  if (input.customPrompt?.trim()) {
    sections.push('自定义提示词：');
    sections.push(input.customPrompt.trim());
  }

  return sections.join('\n');
}

function buildSystemPrompt(systemPrompt?: string) {
  const parts = [
    '你是一名资深技术博客作者。你必须严格返回 YAML Frontmatter + Markdown 正文，不要输出额外解释。',
  ];

  if (systemPrompt?.trim()) {
    parts.push('补充系统提示：');
    parts.push(systemPrompt.trim());
  }

  return parts.join('\n');
}

function normalizeQueryList(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  const seen = new Set<string>();

  return input
    .map((item) => String(item ?? '').replace(/\s+/g, ' ').trim())
    .filter((item) => item.length >= 3)
    .filter((item) => {
      const normalized = item.toLowerCase();

      if (seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    })
    .slice(0, 6);
}

function buildCoverQueryPrompt(input: CoverQueryRequest) {
  return [
    '请根据下面这篇博客的整体内容，生成适合找封面图的英文检索词。',
    '目标不是总结文章，而是帮助图片搜索引擎找到合适的封面场景。',
    '请优先给出具象、可视化、适合做横版封面的短语。',
    '规则：',
    '- 每条检索词使用英文。',
    '- 每条 2 到 6 个词。',
    '- 尽量描述场景、物体、界面、工作台、部署环境，而不是抽象概念。',
    '- 如果文章主题偏技术，可以给出 dashboard、workspace、server rack、coding setup 这类更容易搜到图的表达。',
    '- 不要输出解释，只返回 JSON。',
    '输出格式：',
    '{"queries":["query one","query two"]}',
    `标题：${input.title?.trim() || '无'}`,
    `摘要：${input.description?.trim() || '无'}`,
    `标签：${input.tags?.join(', ') || '无'}`,
    '正文摘录：',
    (input.content ?? '').slice(0, 4_000) || '无',
  ].join('\n');
}

function extractDeltaContent(choice?: ChatCompletionChoice) {
  if (!choice) {
    return '';
  }

  const deltaContent = choice.delta?.content;

  if (typeof deltaContent === 'string') {
    return deltaContent;
  }

  if (Array.isArray(deltaContent)) {
    return deltaContent.map((item) => item?.text ?? '').join('');
  }

  return extractTextContent(choice.message?.content);
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
          content: buildSystemPrompt(input.systemPrompt),
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

export async function generateCoverSearchQueries(
  baseUrl: string,
  apiKey: string,
  model: string,
  input: CoverQueryRequest,
): Promise<string[]> {
  const response = await fetch(buildProviderUrl(baseUrl, '/chat/completions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: '你是一名擅长内容理解和视觉编辑的助手。你必须严格返回 JSON，不能输出 JSON 以外的解释。',
        },
        {
          role: 'user',
          content: buildCoverQueryPrompt(input),
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
    throw new Error('AI 没有返回可用的封面检索词。');
  }

  const parsed = JSON.parse(extractJsonBlock(rawText)) as {
    queries?: unknown;
  };
  const queries = normalizeQueryList(parsed.queries);

  if (!queries.length) {
    throw new Error('AI 没有生成可用的封面检索词。');
  }

  return queries;
}

export async function* streamCompatiblePostText(
  baseUrl: string,
  apiKey: string,
  model: string,
  input: GeneratePostRequest,
) {
  const response = await fetch(buildProviderUrl(baseUrl, '/chat/completions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      stream: true,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(input.systemPrompt),
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

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const data = await response.json() as ChatCompletionResponse;
    const rawText = extractTextContent(data.choices?.[0]?.message?.content);

    if (!rawText) {
      throw new Error('AI 服务没有返回可解析的正文内容。');
    }

    yield rawText;
    return;
  }

  if (!response.body) {
    throw new Error('AI 服务未返回可读取的流式内容。');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? '';

    for (const eventText of events) {
      const dataLines = eventText
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .filter(Boolean);

      if (!dataLines.length) {
        continue;
      }

      for (const dataLine of dataLines) {
        if (dataLine === '[DONE]') {
          return;
        }

        const payload = JSON.parse(dataLine) as ChatCompletionResponse;
        const content = extractDeltaContent(payload.choices?.[0]);

        if (content) {
          yield content;
        }
      }
    }
  }
}
