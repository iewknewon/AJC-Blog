import { extractJsonBlock } from './openai-generic';

export type WebResearchSource = {
  title: string;
  url: string;
  snippet: string;
  excerpt?: string;
};

export type WebSearchMode = 'auto' | 'native' | 'local';

export type WebResearchContext = {
  query: string;
  sources: WebResearchSource[];
  summary?: string;
  strategy: 'native' | 'local';
  strategyLabel: string;
  requestedMode?: WebSearchMode;
  provider?: string;
  fallbackReason?: string;
};

type FetchLike = typeof fetch;

type ProviderErrorShape = {
  error?: {
    message?: string;
  };
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

type NativeResearchResponseShape = {
  output_text?: string;
  output?: Array<Record<string, unknown>>;
  sources?: unknown;
};

type NativeSearchStrategy =
  | {
      type: 'responses-web-search';
      label: string;
      provider: string;
    }
  | {
      type: 'chat-search-model';
      label: string;
      provider: string;
    };

const SEARCH_ENDPOINT = 'https://www.bing.com/search?format=rss&mkt=zh-CN&q=';
const SEARCH_TIMEOUT_MS = 12_000;
const PAGE_TIMEOUT_MS = 10_000;
const NATIVE_SEARCH_TIMEOUT_MS = 30_000;
const DEFAULT_SEARCH_LIMIT = 5;
const DEFAULT_PAGE_FETCH_LIMIT = 3;
const LOCAL_SEARCH_CANDIDATE_MULTIPLIER = 3;
const LOCAL_SEARCH_PAGE_FETCH_MULTIPLIER = 2;
const SNIPPET_LIMIT = 240;
const EXCERPT_LIMIT = 1_200;
const SUMMARY_LIMIT = 900;
const GENERIC_QUERY_TERMS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'into',
  'what',
  'when',
  'where',
  'why',
  'how',
  'latest',
  'guide',
  'overview',
  'about',
  '关于',
  '如何',
  '怎么',
  '什么',
  '最新',
  '教程',
  '指南',
  '介绍',
  '分析',
  '总结',
]);

function collapseWhitespace(input: string) {
  return input.replace(/\s+/g, ' ').trim();
}

function trimText(input: string, limit: number) {
  const normalized = collapseWhitespace(input);

  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

function decodeHtmlEntities(input: string) {
  const namedEntities: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: '\'',
    nbsp: ' ',
    mdash: '-',
    ndash: '-',
    hellip: '...',
  };

  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, rawCode) => {
    const code = String(rawCode).toLowerCase();

    if (code.startsWith('#x')) {
      const value = Number.parseInt(code.slice(2), 16);
      return Number.isFinite(value) ? String.fromCodePoint(value) : entity;
    }

    if (code.startsWith('#')) {
      const value = Number.parseInt(code.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : entity;
    }

    return namedEntities[code] ?? entity;
  });
}

function unwrapCdata(input: string) {
  const trimmed = input.trim();

  if (trimmed.startsWith('<![CDATA[') && trimmed.endsWith(']]>')) {
    return trimmed.slice(9, -3);
  }

  return trimmed;
}

function extractXmlTag(block: string, tagName: string) {
  const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i'));
  return match?.[1] ? unwrapCdata(match[1]) : '';
}

function normalizeUrl(input: string) {
  const decoded = decodeHtmlEntities(input).trim();

  if (!decoded) {
    return '';
  }

  try {
    const url = new URL(decoded);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '';
    }

    return url.toString();
  } catch {
    return '';
  }
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '');
}

function buildProviderUrl(baseUrl: string, path: string) {
  return `${normalizeBaseUrl(baseUrl)}${path.startsWith('/') ? path : `/${path}`}`;
}

function getBaseUrlHost(baseUrl: string) {
  try {
    return new URL(normalizeBaseUrl(baseUrl)).host;
  } catch {
    return '';
  }
}

function extractCompletionText(content: ChatCompletionMessage['content']) {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content.map((item) => item?.text ?? '').join('').trim();
}

function extractResponseOutputText(payload: NativeResearchResponseShape) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  const chunks: string[] = [];

  output.forEach((item) => {
    if (item?.type !== 'message' || !Array.isArray(item.content)) {
      return;
    }

    item.content.forEach((part) => {
      if (typeof part?.text === 'string' && part.text.trim()) {
        chunks.push(part.text.trim());
        return;
      }

      if (typeof part?.content === 'string' && part.content.trim()) {
        chunks.push(part.content.trim());
      }
    });
  });

  return chunks.join('\n').trim();
}

function normalizeNativeSourceList(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  const seen = new Set<string>();

  return input
    .map((item): WebResearchSource | null => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const title = trimText(
        String(
          (item as { title?: unknown; name?: unknown }).title
          ?? (item as { title?: unknown; name?: unknown }).name
          ?? '',
        ),
        160,
      );
      const url = normalizeUrl(
        String(
          (item as { url?: unknown; link?: unknown }).url
          ?? (item as { url?: unknown; link?: unknown }).link
          ?? '',
        ),
      );
      const snippet = trimText(
        String(
          (item as { snippet?: unknown; summary?: unknown; description?: unknown }).snippet
          ?? (item as { snippet?: unknown; summary?: unknown; description?: unknown }).summary
          ?? (item as { snippet?: unknown; summary?: unknown; description?: unknown }).description
          ?? '',
        ),
        SNIPPET_LIMIT,
      );
      const excerpt = trimText(
        String((item as { excerpt?: unknown; content?: unknown }).excerpt ?? (item as { excerpt?: unknown; content?: unknown }).content ?? ''),
        EXCERPT_LIMIT,
      );

      if (!title || !url || seen.has(url)) {
        return null;
      }

      seen.add(url);

      return {
        title,
        url,
        snippet,
        excerpt: excerpt || undefined,
      };
    })
    .filter((item): item is WebResearchSource => Boolean(item));
}

function dedupeSources(sources: WebResearchSource[]) {
  const sourceMap = new Map<string, WebResearchSource>();

  sources.forEach((source) => {
    const key = source.url;

    if (!key) {
      return;
    }

    const existing = sourceMap.get(key);

    if (!existing) {
      sourceMap.set(key, source);
      return;
    }

    sourceMap.set(key, {
      title: existing.title || source.title,
      url: source.url,
      snippet: existing.snippet || source.snippet,
      excerpt: existing.excerpt || source.excerpt,
    });
  });

  return [...sourceMap.values()];
}

function extractResponseToolSources(payload: NativeResearchResponseShape) {
  const collected: WebResearchSource[] = [];
  const pushSources = (input: unknown) => {
    collected.push(...normalizeNativeSourceList(input));
  };

  pushSources(payload.sources);

  if (!Array.isArray(payload.output)) {
    return dedupeSources(collected);
  }

  payload.output.forEach((item) => {
    pushSources((item as { action?: { sources?: unknown } }).action?.sources);

    if (item?.type !== 'message' || !Array.isArray(item.content)) {
      return;
    }

    item.content.forEach((part) => {
      const annotations = Array.isArray(part?.annotations) ? part.annotations : [];

      annotations.forEach((annotation) => {
        const url = normalizeUrl(String(annotation?.url ?? annotation?.uri ?? ''));
        const title = trimText(String(annotation?.title ?? annotation?.text ?? '参考来源'), 160);

        if (!url || !title) {
          return;
        }

        collected.push({
          title,
          url,
          snippet: trimText(String(annotation?.text ?? ''), SNIPPET_LIMIT),
        });
      });
    });
  });

  return dedupeSources(collected);
}

function parseStructuredNativeResearch(rawText: string, fallbackQuery: string) {
  const fallbackSummary = trimText(rawText, SUMMARY_LIMIT);

  try {
    const parsed = JSON.parse(extractJsonBlock(rawText)) as {
      query?: unknown;
      summary?: unknown;
      sources?: unknown;
    };

    return {
      query: collapseWhitespace(String(parsed.query ?? fallbackQuery)) || fallbackQuery,
      summary: trimText(String(parsed.summary ?? ''), SUMMARY_LIMIT),
      sources: normalizeNativeSourceList(parsed.sources),
    };
  } catch {
    return {
      query: fallbackQuery,
      summary: fallbackSummary,
      sources: [] as WebResearchSource[],
    };
  }
}

function isOpenAiBaseUrl(baseUrl: string) {
  try {
    const url = new URL(normalizeBaseUrl(baseUrl));
    return url.hostname === 'api.openai.com';
  } catch {
    return false;
  }
}

function isChatSearchModel(model: string) {
  const normalized = model.trim().toLowerCase();
  return normalized.includes('search-preview') || normalized.includes('search-api');
}

function detectNativeSearchStrategy(baseUrl: string, model: string): NativeSearchStrategy | null {
  if (isChatSearchModel(model)) {
    return {
      type: 'chat-search-model',
      label: '模型原生联网',
      provider: isOpenAiBaseUrl(baseUrl)
        ? 'OpenAI search model'
        : `兼容 search model（${getBaseUrlHost(baseUrl) || 'custom endpoint'}）`,
    };
  }

  return {
    type: 'responses-web-search',
    label: '模型原生联网',
    provider: isOpenAiBaseUrl(baseUrl)
      ? 'OpenAI Responses API'
      : `兼容 Responses API（${getBaseUrlHost(baseUrl) || 'custom endpoint'}）`,
  };
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

function buildNativeResearchPrompt(query: string) {
  return [
    '请联网检索下面这个主题，并整理成适合博客写作引用的资料摘要。',
    '必须优先使用联网检索，不要只依赖模型已有记忆。',
    '如果第一轮搜索结果不够相关，请自行改写关键词继续检索，直到拿到直接相关的公开资料。',
    '请严格只返回 JSON，不要输出 Markdown、代码块或额外解释。',
    '输出格式：',
    '{"query":"原始检索词","summary":"2到4句中文总结","sources":[{"title":"来源标题","url":"来源链接","snippet":"一句中文摘要"}]}',
    '要求：',
    '- sources 保留 3 到 5 条最直接相关的网页来源。',
    '- 如果没有足够相关的来源，sources 返回空数组，不要勉强凑结果。',
    '- url 必须是网页原始链接，不能留空。',
    '- summary 用中文写，适合后续直接喂给写作模型。',
    '- snippet 用中文浓缩每条来源的核心信息。',
    `检索主题：${query}`,
  ].join('\n');
}

function normalizeSearchText(input: string) {
  return collapseWhitespace(htmlToPlainText(input)).toLowerCase();
}

function extractSearchTerms(query: string) {
  const normalized = collapseWhitespace(query).toLowerCase();
  const chunks = normalized.match(/[\p{L}\p{N}]+/gu) ?? [];
  const terms: string[] = [];
  const seen = new Set<string>();

  chunks.forEach((chunk) => {
    const term = chunk.trim();

    if (!term || term.length < 2 || GENERIC_QUERY_TERMS.has(term) || seen.has(term)) {
      return;
    }

    seen.add(term);
    terms.push(term);
  });

  if (terms.length) {
    return terms;
  }

  return normalized ? [normalized] : [];
}

function scoreSourceRelevance(query: string, source: WebResearchSource) {
  const phrase = collapseWhitespace(query).toLowerCase();
  const terms = extractSearchTerms(query);
  const title = normalizeSearchText(source.title);
  const snippet = normalizeSearchText(source.snippet);
  const excerpt = normalizeSearchText(source.excerpt ?? '');
  const combined = collapseWhitespace([title, snippet, excerpt].filter(Boolean).join(' '));

  let score = 0;
  let matchedTerms = 0;
  let titleMatches = 0;
  let hasStrongMatch = false;

  if (phrase && title.includes(phrase)) {
    score += 12;
    hasStrongMatch = true;
  } else if (phrase && combined.includes(phrase)) {
    score += 8;
    hasStrongMatch = true;
  }

  terms.forEach((term) => {
    const inTitle = title.includes(term);
    const inSnippet = snippet.includes(term);
    const inExcerpt = excerpt.includes(term);

    if (!inTitle && !inSnippet && !inExcerpt) {
      return;
    }

    matchedTerms += 1;

    if (inTitle) {
      titleMatches += 1;
      score += term.length >= 4 ? 6 : 4;

      if (term.length >= 4) {
        hasStrongMatch = true;
      }
    }

    if (inSnippet) {
      score += term.length >= 4 ? 3 : 2;
    }

    if (inExcerpt) {
      score += term.length >= 4 ? 2 : 1;
    }
  });

  const keep = hasStrongMatch || titleMatches > 0 || matchedTerms >= Math.min(2, terms.length || 1);

  return {
    keep,
    score,
  };
}

function filterRelevantLocalSources(query: string, sources: WebResearchSource[], limit: number) {
  return sources
    .map((source) => ({
      source,
      ...scoreSourceRelevance(query, source),
    }))
    .filter((item) => item.keep && item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((item) => item.source);
}

export function htmlToPlainText(input: string) {
  const withoutHiddenBlocks = input
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const withLineBreakHints = withoutHiddenBlocks
    .replace(/<\/(p|div|section|article|main|aside|header|footer|li|ul|ol|h[1-6]|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  return collapseWhitespace(decodeHtmlEntities(withLineBreakHints));
}

export function parseBingSearchResults(xml: string) {
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  const seenUrls = new Set<string>();

  return itemBlocks
    .map((itemBlock): WebResearchSource | null => {
      const title = trimText(htmlToPlainText(extractXmlTag(itemBlock, 'title')), 160);
      const url = normalizeUrl(extractXmlTag(itemBlock, 'link'));
      const snippet = trimText(htmlToPlainText(extractXmlTag(itemBlock, 'description')), SNIPPET_LIMIT);

      if (!title || !url || seenUrls.has(url)) {
        return null;
      }

      seenUrls.add(url);

      return {
        title,
        url,
        snippet,
      };
    })
    .filter((item): item is WebResearchSource => Boolean(item));
}

async function fetchWithTimeout(fetchImpl: FetchLike, input: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPageExcerpt(fetchImpl: FetchLike, url: string) {
  const response = await fetchWithTimeout(
    fetchImpl,
    url,
    {
      headers: {
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,application/xml;q=0.8,*/*;q=0.5',
      },
      redirect: 'follow',
    },
    PAGE_TIMEOUT_MS,
  );

  if (!response.ok) {
    return '';
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (!/text\/html|application\/xhtml\+xml|text\/plain/i.test(contentType)) {
    return '';
  }

  const body = await response.text();
  const plainText = contentType.includes('text/plain') ? collapseWhitespace(body) : htmlToPlainText(body);

  return trimText(plainText, EXCERPT_LIMIT);
}

async function collectLocalWebResearch(
  query: string,
  options: {
    searchLimit?: number;
    pageFetchLimit?: number;
    fetchImpl?: FetchLike;
    requestedMode?: WebSearchMode;
    fallbackReason?: string;
  } = {},
): Promise<WebResearchContext> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return {
      query: '',
      sources: [],
      strategy: 'local',
      strategyLabel: options.fallbackReason ? '本地检索（原生联网回退）' : '本地检索',
      requestedMode: options.requestedMode,
      fallbackReason: options.fallbackReason,
    };
  }

  const searchLimit = Math.max(1, options.searchLimit ?? DEFAULT_SEARCH_LIMIT);
  const pageFetchLimit = Math.max(0, options.pageFetchLimit ?? DEFAULT_PAGE_FETCH_LIMIT);
  const candidateLimit = Math.max(searchLimit, searchLimit * LOCAL_SEARCH_CANDIDATE_MULTIPLIER);
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchWithTimeout(
    fetchImpl,
    `${SEARCH_ENDPOINT}${encodeURIComponent(normalizedQuery)}`,
    {
      headers: {
        Accept: 'application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    },
    SEARCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`联网检索失败（HTTP ${response.status}）`);
  }

  const xml = await response.text();
  const baseSources = parseBingSearchResults(xml).slice(0, candidateLimit);

  if (!baseSources.length) {
    return {
      query: normalizedQuery,
      sources: [],
      strategy: 'local',
      strategyLabel: options.fallbackReason ? '本地检索（原生联网回退）' : '本地检索',
      requestedMode: options.requestedMode,
      fallbackReason: options.fallbackReason,
    };
  }

  const pageEnrichmentLimit = Math.min(
    baseSources.length,
    Math.max(pageFetchLimit, pageFetchLimit * LOCAL_SEARCH_PAGE_FETCH_MULTIPLIER),
  );
  const enrichedSources = await Promise.all(
    baseSources.map(async (source, index) => {
      if (index >= pageEnrichmentLimit) {
        return source;
      }

      try {
        const excerpt = await fetchPageExcerpt(fetchImpl, source.url);
        return excerpt ? { ...source, excerpt } : source;
      } catch {
        return source;
      }
    }),
  );
  const relevantSources = filterRelevantLocalSources(normalizedQuery, enrichedSources, searchLimit);

  return {
    query: normalizedQuery,
    sources: relevantSources,
    strategy: 'local',
    strategyLabel: options.fallbackReason ? '本地检索（原生联网回退）' : '本地检索',
    requestedMode: options.requestedMode,
    fallbackReason: options.fallbackReason,
  };
}

async function collectResponsesApiWebResearch(
  query: string,
  options: {
    baseUrl: string;
    apiKey: string;
    model: string;
    fetchImpl?: FetchLike;
    requestedMode?: WebSearchMode;
  },
): Promise<WebResearchContext> {
  const response = await fetchWithTimeout(
    options.fetchImpl ?? fetch,
    buildProviderUrl(options.baseUrl, '/responses'),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: options.model,
        tools: [
          {
            type: 'web_search',
          },
        ],
        include: ['web_search_call.action.sources'],
        input: buildNativeResearchPrompt(query),
      }),
      redirect: 'follow',
    },
    NATIVE_SEARCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(await parseProviderError(response));
  }

  const payload = await response.json() as NativeResearchResponseShape;
  const rawText = extractResponseOutputText(payload);
  const structured = rawText ? parseStructuredNativeResearch(rawText, query) : {
    query,
    summary: '',
    sources: [] as WebResearchSource[],
  };
  const toolSources = extractResponseToolSources(payload);
  const sources = dedupeSources([...structured.sources, ...toolSources]).slice(0, DEFAULT_SEARCH_LIMIT);

  if (!rawText && !sources.length) {
    throw new Error('模型原生联网没有返回可用的资料结果');
  }

  return {
    query: structured.query || query,
    sources,
    summary: structured.summary || undefined,
    strategy: 'native',
    strategyLabel: '模型原生联网',
    requestedMode: options.requestedMode,
    provider: isOpenAiBaseUrl(options.baseUrl)
      ? 'OpenAI Responses API'
      : `兼容 Responses API（${getBaseUrlHost(options.baseUrl) || 'custom endpoint'}）`,
  };
}

async function collectChatSearchModelResearch(
  query: string,
  options: {
    baseUrl: string;
    apiKey: string;
    model: string;
    fetchImpl?: FetchLike;
    requestedMode?: WebSearchMode;
  },
): Promise<WebResearchContext> {
  const response = await fetchWithTimeout(
    options.fetchImpl ?? fetch,
    buildProviderUrl(options.baseUrl, '/chat/completions'),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: options.model,
        temperature: 0.2,
        web_search_options: {},
        messages: [
          {
            role: 'user',
            content: buildNativeResearchPrompt(query),
          },
        ],
      }),
      redirect: 'follow',
    },
    NATIVE_SEARCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(await parseProviderError(response));
  }

  const payload = await response.json() as ChatCompletionResponse;
  const rawText = extractCompletionText(payload.choices?.[0]?.message?.content);

  if (!rawText) {
    throw new Error('模型原生联网没有返回可用的资料结果');
  }

  const structured = parseStructuredNativeResearch(rawText, query);

  return {
    query: structured.query || query,
    sources: structured.sources.slice(0, DEFAULT_SEARCH_LIMIT),
    summary: structured.summary || undefined,
    strategy: 'native',
    strategyLabel: '模型原生联网',
    requestedMode: options.requestedMode,
    provider: isOpenAiBaseUrl(options.baseUrl)
      ? 'OpenAI search model'
      : `兼容 search model（${getBaseUrlHost(options.baseUrl) || 'custom endpoint'}）`,
  };
}

export async function collectWebResearch(
  query: string,
  options: {
    searchLimit?: number;
    pageFetchLimit?: number;
    fetchImpl?: FetchLike;
    baseUrl?: string;
    apiKey?: string;
    model?: string;
    mode?: WebSearchMode;
  } = {},
): Promise<WebResearchContext> {
  const normalizedQuery = query.trim();
  const requestedMode = options.mode ?? 'local';

  if (!normalizedQuery) {
    return {
      query: '',
      sources: [],
      strategy: 'local',
      strategyLabel: '本地检索',
      requestedMode,
    };
  }

  const baseUrl = String(options.baseUrl ?? '').trim();
  const apiKey = String(options.apiKey ?? '').trim();
  const model = String(options.model ?? '').trim();
  const strategy = requestedMode !== 'local' && baseUrl && apiKey && model
    ? detectNativeSearchStrategy(baseUrl, model)
    : null;
  let nativeFailureMessage = '';

  if (requestedMode !== 'local' && strategy) {
    try {
      if (strategy.type === 'responses-web-search') {
        return await collectResponsesApiWebResearch(normalizedQuery, {
          baseUrl,
          apiKey,
          model,
          fetchImpl: options.fetchImpl,
          requestedMode,
        });
      }

      return await collectChatSearchModelResearch(normalizedQuery, {
        baseUrl,
        apiKey,
        model,
        fetchImpl: options.fetchImpl,
        requestedMode,
      });
    } catch (error) {
      nativeFailureMessage = error instanceof Error ? error.message : '模型原生联网失败';
    }
  }

  if (requestedMode === 'native' && !strategy) {
    nativeFailureMessage = '当前供应商或模型暂时无法识别为支持原生联网，已回退到本地检索';
  }

  return collectLocalWebResearch(normalizedQuery, {
    searchLimit: options.searchLimit,
    pageFetchLimit: options.pageFetchLimit,
    fetchImpl: options.fetchImpl,
    requestedMode,
    fallbackReason: nativeFailureMessage || undefined,
  });
}
