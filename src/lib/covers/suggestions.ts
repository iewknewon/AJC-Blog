import { extractJsonBlock, generateCompatibleText } from '../ai/openai-generic';

type FetchLike = typeof fetch;

type OpenverseImageResult = {
  id?: string | number;
  title?: string;
  creator?: string;
  creator_url?: string;
  url?: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  license?: string;
  license_version?: string;
  foreign_landing_url?: string;
};

type OpenverseSearchResponse = {
  results?: OpenverseImageResult[];
};

type WikimediaPage = {
  title?: string;
  canonicalurl?: string;
  fullurl?: string;
  imageinfo?: Array<{
    url?: string;
    thumburl?: string;
    width?: number;
    height?: number;
    extmetadata?: Record<string, { value?: string }>;
  }>;
};

type WikimediaSearchResponse = {
  query?: {
    pages?: Record<string, WikimediaPage>;
  };
};

type ImageCandidate = {
  title: string;
  imageUrl: string;
  previewUrl: string;
  creator?: string;
  creatorUrl?: string;
  license?: string;
  sourceUrl?: string;
  width?: number;
  height?: number;
  provider: 'openverse' | 'wikimedia';
  providerLabel: string;
  textForScoring: string;
};

export type CoverSuggestionInput = {
  title?: string;
  description?: string;
  tags?: string[] | string;
  content?: string;
};

export type CoverSuggestion = {
  query: string;
  coverUrl: string;
  previewUrl: string;
  title: string;
  creator?: string;
  creatorUrl?: string;
  license?: string;
  sourceUrl?: string;
  width?: number;
  height?: number;
  queryMode: 'ai' | 'heuristic';
  provider: 'openverse' | 'wikimedia';
  providerLabel: string;
  selectionReason?: string;
};

type ScoredCoverSuggestion = CoverSuggestion & {
  score: number;
};

type SuggestionRerankConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  objective: string;
};

const OPENVERSE_ENDPOINT = 'https://api.openverse.org/v1/images/';
const WIKIMEDIA_ENDPOINT = 'https://commons.wikimedia.org/w/api.php';
const SEARCH_TIMEOUT_MS = 10_000;
const DEFAULT_PAGE_SIZE = 12;
const STOP_WORDS = new Set([
  'about',
  'after',
  'also',
  'article',
  'blog',
  'cloud',
  'content',
  'deploy',
  'from',
  'into',
  'more',
  'page',
  'post',
  'that',
  'this',
  'with',
  'your',
]);

function collapseWhitespace(input: string) {
  return input.replace(/\s+/g, ' ').trim();
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

function stripHtml(input: string) {
  return collapseWhitespace(decodeHtmlEntities(String(input ?? '').replace(/<[^>]+>/g, ' ')));
}

function isHttpUrl(input: string | undefined) {
  if (!input) {
    return false;
  }

  try {
    const url = new URL(input);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeTags(tags?: string[] | string) {
  if (Array.isArray(tags)) {
    return [...new Set(tags.map((tag) => collapseWhitespace(String(tag))).filter(Boolean))];
  }

  return [...new Set(String(tags ?? '').split(/[，,]/).map((tag) => collapseWhitespace(tag)).filter(Boolean))];
}

function stripMarkdown(input: string) {
  return collapseWhitespace(
    input
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1 ')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ')
      .replace(/<\/?[^>]+>/g, ' ')
      .replace(/[#>*_~-]+/g, ' ')
      .replace(/https?:\/\/\S+/g, ' '),
  );
}

function extractLatinTokens(input: string) {
  const matches = collapseWhitespace(input).match(/[A-Za-z][A-Za-z0-9+-]{1,}/g) ?? [];

  return [...new Set(
    matches
      .map((token) => token.toLowerCase())
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
  )];
}

function dedupeQueries(queries: string[]) {
  const seen = new Set<string>();

  return queries.filter((query) => {
    const normalized = collapseWhitespace(query).toLowerCase();

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function trimText(input: string, limit: number) {
  const normalized = collapseWhitespace(input);

  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

function buildLicenseLabel(license: string, version = '') {
  const normalizedLicense = collapseWhitespace(license);
  const normalizedVersion = collapseWhitespace(version);

  if (!normalizedLicense) {
    return '';
  }

  return `${normalizedLicense.toUpperCase()}${normalizedVersion ? ` ${normalizedVersion}` : ''}`;
}

export function buildCoverSearchQueries(input: CoverSuggestionInput) {
  const title = collapseWhitespace(String(input.title ?? ''));
  const description = collapseWhitespace(String(input.description ?? ''));
  const tags = normalizeTags(input.tags);
  const plainContent = stripMarkdown(String(input.content ?? '')).slice(0, 1_600);
  const latinTokens = [...new Set([
    ...tags.flatMap((tag) => extractLatinTokens(tag)),
    ...extractLatinTokens(`${title} ${description}`),
    ...extractLatinTokens(plainContent),
  ])];
  const shortDescription = description.split(/[。！？?!]/)[0]?.trim() ?? '';
  const queries = dedupeQueries([
    latinTokens.slice(0, 5).join(' '),
    tags.slice(0, 4).join(' '),
    [title, ...tags.slice(0, 2)].filter(Boolean).join(' '),
    title,
    shortDescription,
    plainContent.slice(0, 80),
  ]);

  return queries.filter((query) => query.length >= 3).slice(0, 6);
}

function fetchWithTimeout(fetchImpl: FetchLike, url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetchImpl(url, {
    ...init,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timer);
  });
}

function scoreImageCandidate(item: ImageCandidate, query: string) {
  const text = collapseWhitespace(item.textForScoring).toLowerCase();
  const queryTokens = extractLatinTokens(query);
  const matchedTokens = queryTokens.filter((token) => text.includes(token)).length;
  const relevanceScore = queryTokens.length ? matchedTokens / queryTokens.length : 0.2;
  const aspectRatio = typeof item.width === 'number' && typeof item.height === 'number' && item.height > 0
    ? item.width / item.height
    : null;
  const aspectScore = aspectRatio ? Math.max(0, 1 - Math.abs(aspectRatio - 16 / 9) / 1.4) : 0.35;
  const sizeScore = typeof item.width === 'number' && typeof item.height === 'number'
    ? Math.min((item.width * item.height) / (1600 * 900), 1)
    : 0.25;
  const license = String(item.license ?? '').toLowerCase();
  const licenseScore = /(cc0|public domain|pdm)/.test(license) ? 0.8 : /(cc by|cc-by|by-sa)/.test(license) ? 0.35 : 0;
  const providerScore = item.provider === 'wikimedia' ? 0.12 : 0;

  return relevanceScore * 4 + aspectScore * 2 + sizeScore + licenseScore + providerScore;
}

async function searchOpenverseImages(query: string, fetchImpl: FetchLike) {
  const url = new URL(OPENVERSE_ENDPOINT);
  url.searchParams.set('q', query);
  url.searchParams.set('page_size', String(DEFAULT_PAGE_SIZE));
  url.searchParams.set('mature', 'false');

  const response = await fetchWithTimeout(
    fetchImpl,
    url.toString(),
    {
      headers: {
        Accept: 'application/json',
      },
      redirect: 'follow',
    },
    SEARCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`封面检索失败（HTTP ${response.status}）`);
  }

  const data = await response.json() as OpenverseSearchResponse;

  return (data.results ?? [])
    .map((item): ImageCandidate | null => {
      const previewUrl = isHttpUrl(item.thumbnail) ? String(item.thumbnail) : '';
      const imageUrl = previewUrl || (isHttpUrl(item.url) ? String(item.url) : '');

      if (!imageUrl) {
        return null;
      }

      const title = collapseWhitespace(String(item.title ?? '未命名图片')) || '未命名图片';

      return {
        title,
        imageUrl,
        previewUrl: previewUrl || imageUrl,
        creator: collapseWhitespace(String(item.creator ?? '')) || undefined,
        creatorUrl: isHttpUrl(item.creator_url) ? String(item.creator_url) : undefined,
        license: buildLicenseLabel(String(item.license ?? ''), String(item.license_version ?? '')) || undefined,
        sourceUrl: isHttpUrl(item.foreign_landing_url) ? String(item.foreign_landing_url) : (isHttpUrl(item.url) ? String(item.url) : undefined),
        width: typeof item.width === 'number' ? item.width : undefined,
        height: typeof item.height === 'number' ? item.height : undefined,
        provider: 'openverse',
        providerLabel: 'Openverse',
        textForScoring: title,
      };
    })
    .filter((item): item is ImageCandidate => Boolean(item));
}

async function searchWikimediaImages(query: string, fetchImpl: FetchLike) {
  const url = new URL(WIKIMEDIA_ENDPOINT);
  url.searchParams.set('action', 'query');
  url.searchParams.set('generator', 'search');
  url.searchParams.set('gsrsearch', query);
  url.searchParams.set('gsrnamespace', '6');
  url.searchParams.set('gsrlimit', String(DEFAULT_PAGE_SIZE));
  url.searchParams.set('prop', 'imageinfo|info');
  url.searchParams.set('iiprop', 'url|extmetadata|size');
  url.searchParams.set('iiurlwidth', '960');
  url.searchParams.set('inprop', 'url');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const response = await fetchWithTimeout(
    fetchImpl,
    url.toString(),
    {
      headers: {
        Accept: 'application/json',
      },
      redirect: 'follow',
    },
    SEARCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`封面检索失败（HTTP ${response.status}）`);
  }

  const data = await response.json() as WikimediaSearchResponse;
  const pages = Object.values(data.query?.pages ?? {});

  return pages
    .map((page): ImageCandidate | null => {
      const imageInfo = Array.isArray(page.imageinfo) ? page.imageinfo[0] : null;

      if (!imageInfo) {
        return null;
      }

      const previewUrl = isHttpUrl(imageInfo.thumburl) ? String(imageInfo.thumburl) : '';
      const imageUrl = isHttpUrl(imageInfo.url) ? String(imageInfo.url) : '';

      if (!previewUrl && !imageUrl) {
        return null;
      }

      const metadata = imageInfo.extmetadata ?? {};
      const description = stripHtml(metadata.ImageDescription?.value ?? '');
      const creator = stripHtml(metadata.Artist?.value ?? '');
      const license = stripHtml(metadata.LicenseShortName?.value ?? metadata.License?.value ?? '');
      const title = stripHtml(String(page.title ?? '').replace(/^File:/i, '')) || 'Wikimedia Commons 图片';

      return {
        title,
        imageUrl: imageUrl || previewUrl,
        previewUrl: previewUrl || imageUrl,
        creator: creator || undefined,
        license: license || undefined,
        sourceUrl: isHttpUrl(page.canonicalurl) ? String(page.canonicalurl) : (isHttpUrl(page.fullurl) ? String(page.fullurl) : undefined),
        width: typeof imageInfo.width === 'number' ? imageInfo.width : undefined,
        height: typeof imageInfo.height === 'number' ? imageInfo.height : undefined,
        provider: 'wikimedia',
        providerLabel: 'Wikimedia Commons',
        textForScoring: [title, description].filter(Boolean).join(' '),
      };
    })
    .filter((item): item is ImageCandidate => Boolean(item));
}

function getSuggestionKey(item: CoverSuggestion) {
  return item.sourceUrl || item.coverUrl;
}

function toCoverSuggestion(
  item: ImageCandidate,
  query: string,
  queryMode: 'ai' | 'heuristic',
  score: number,
): ScoredCoverSuggestion {
  return {
    query,
    coverUrl: item.imageUrl,
    previewUrl: item.previewUrl,
    title: item.title,
    creator: item.creator,
    creatorUrl: item.creatorUrl,
    license: item.license,
    sourceUrl: item.sourceUrl,
    width: item.width,
    height: item.height,
    queryMode,
    provider: item.provider,
    providerLabel: item.providerLabel,
    score,
  };
}

function stripScore(item: ScoredCoverSuggestion): CoverSuggestion {
  return {
    query: item.query,
    coverUrl: item.coverUrl,
    previewUrl: item.previewUrl,
    title: item.title,
    creator: item.creator,
    creatorUrl: item.creatorUrl,
    license: item.license,
    sourceUrl: item.sourceUrl,
    width: item.width,
    height: item.height,
    queryMode: item.queryMode,
    provider: item.provider,
    providerLabel: item.providerLabel,
    selectionReason: item.selectionReason,
  };
}

async function searchCandidatesForQuery(query: string, fetchImpl: FetchLike) {
  const [openverseResult, wikimediaResult] = await Promise.allSettled([
    searchOpenverseImages(query, fetchImpl),
    searchWikimediaImages(query, fetchImpl),
  ]);

  const candidates: ImageCandidate[] = [];

  if (openverseResult.status === 'fulfilled') {
    candidates.push(...openverseResult.value);
  }

  if (wikimediaResult.status === 'fulfilled') {
    candidates.push(...wikimediaResult.value);
  }

  return candidates;
}

async function rerankSuggestionsWithAi(
  candidates: ScoredCoverSuggestion[],
  limit: number,
  config?: SuggestionRerankConfig,
) {
  if (!config || candidates.length <= 1) {
    return candidates;
  }

  const candidateItems = candidates.slice(0, Math.min(candidates.length, Math.max(limit * 2, 6)));
  const candidateLines = candidateItems.map((item, index) => [
    `候选 ${index + 1}:`,
    `- id: c${index + 1}`,
    `- 标题: ${item.title}`,
    `- 来源: ${item.providerLabel}`,
    `- 检索词: ${item.query}`,
    `- 匹配方式: ${item.queryMode === 'ai' ? '整篇内容理解' : '关键词检索'}`,
    `- 许可: ${item.license || '未知'}`,
    `- 作者: ${item.creator || '未知'}`,
    `- 尺寸: ${item.width && item.height ? `${item.width}x${item.height}` : '未知'}`,
    `- 链接: ${item.sourceUrl || item.coverUrl}`,
  ].join('\n')).join('\n\n');

  try {
    const rawText = await generateCompatibleText(config.baseUrl, config.apiKey, config.model, {
      systemPrompt: '你是一名负责博客封面与插图筛选的视觉编辑。你必须只返回 JSON，不要输出额外解释。',
      userPrompt: [
        '请从下面的图片候选中，挑出最适合当前写作任务的结果，并按优先级排序。',
        '必须重点考虑：是否贴合文章主题、是否是具体可视化场景、是否适合技术博客、是否更适合作为封面或说明性插图。',
        '严格返回 JSON：',
        '{"selected":[{"id":"c1","reason":"一句中文说明"}]}',
        `最多返回 ${limit} 个候选。`,
        `筛选目标：${config.objective}`,
        '候选列表：',
        candidateLines,
      ].join('\n'),
      temperature: 0.2,
    });

    const parsed = JSON.parse(extractJsonBlock(rawText)) as {
      selected?: Array<{
        id?: string;
        reason?: string;
      }>;
    };

    const selected = Array.isArray(parsed.selected) ? parsed.selected : [];

    if (!selected.length) {
      return candidates;
    }

    const selectedMap = new Map<string, string>();
    selected.forEach((item) => {
      const id = collapseWhitespace(String(item.id ?? ''));

      if (!id || selectedMap.has(id)) {
        return;
      }

      selectedMap.set(id, trimText(String(item.reason ?? ''), 140));
    });

    const reranked = candidateItems
      .map((candidate, index) => {
        const id = `c${index + 1}`;
        const reason = selectedMap.get(id);

        return reason
          ? { ...candidate, selectionReason: reason }
          : null;
      })
      .filter((item): item is ScoredCoverSuggestion => Boolean(item));

    if (!reranked.length) {
      return candidates;
    }

    const remaining = candidates.filter((candidate) => !reranked.some((selectedItem) => getSuggestionKey(selectedItem) === getSuggestionKey(candidate)));
    return [...reranked, ...remaining];
  } catch {
    return candidates;
  }
}

export async function suggestCoverCandidatesFromContent(
  input: CoverSuggestionInput,
  options: {
    fetchImpl?: FetchLike;
    preferredQueries?: string[];
    limit?: number;
    rerankConfig?: SuggestionRerankConfig;
  } = {},
): Promise<CoverSuggestion[]> {
  const preferredQueries = (options.preferredQueries ?? []).map((item) => collapseWhitespace(String(item))).filter(Boolean);
  const heuristicQueries = buildCoverSearchQueries(input);
  const queries = dedupeQueries([...preferredQueries, ...heuristicQueries]);
  const limit = Math.max(1, options.limit ?? 3);

  if (!queries.length) {
    return [];
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const candidateMap = new Map<string, ScoredCoverSuggestion>();

  for (const query of queries) {
    const queryMode = preferredQueries.some((item) => item.toLowerCase() === query.toLowerCase()) ? 'ai' : 'heuristic';
    const results = await searchCandidatesForQuery(query, fetchImpl);

    if (!results.length) {
      continue;
    }

    const scoredResults = [...results]
      .map((item) => ({
        item,
        score: scoreImageCandidate(item, query),
      }))
      .sort((left, right) => right.score - left.score);

    scoredResults.forEach(({ item, score }) => {
      const suggestion = toCoverSuggestion(item, query, queryMode, score);
      const key = getSuggestionKey(suggestion);
      const existing = candidateMap.get(key);

      if (!existing || suggestion.score > existing.score) {
        candidateMap.set(key, suggestion);
      }
    });

    if (candidateMap.size >= Math.max(limit * 2, 6)) {
      break;
    }
  }

  const ranked = [...candidateMap.values()].sort((left, right) => right.score - left.score);
  const reranked = await rerankSuggestionsWithAi(ranked, limit, options.rerankConfig);

  return reranked
    .slice(0, limit)
    .map(stripScore);
}

export async function suggestCoverFromContent(
  input: CoverSuggestionInput,
  options: {
    fetchImpl?: FetchLike;
    preferredQueries?: string[];
    limit?: number;
    rerankConfig?: SuggestionRerankConfig;
  } = {},
): Promise<CoverSuggestion | null> {
  const suggestions = await suggestCoverCandidatesFromContent(input, {
    ...options,
    limit: options.limit ?? 1,
  });
  return suggestions[0] ?? null;
}

export async function suggestImageCandidatesForQuery(
  query: string,
  options: {
    fetchImpl?: FetchLike;
    queryMode?: 'ai' | 'heuristic';
    limit?: number;
    rerankConfig?: SuggestionRerankConfig;
  } = {},
): Promise<CoverSuggestion[]> {
  const normalizedQuery = collapseWhitespace(query);

  if (!normalizedQuery) {
    return [];
  }

  const limit = Math.max(1, options.limit ?? 3);
  const results = await searchCandidatesForQuery(normalizedQuery, options.fetchImpl ?? fetch);

  if (!results.length) {
    return [];
  }

  const ranked = results
    .map((item) => toCoverSuggestion(
      item,
      normalizedQuery,
      options.queryMode ?? 'ai',
      scoreImageCandidate(item, normalizedQuery),
    ))
    .sort((left, right) => right.score - left.score);
  const reranked = await rerankSuggestionsWithAi(ranked, limit, options.rerankConfig);

  return reranked
    .slice(0, limit)
    .map(stripScore);
}

export async function suggestImageForQuery(
  query: string,
  options: {
    fetchImpl?: FetchLike;
    queryMode?: 'ai' | 'heuristic';
    rerankConfig?: SuggestionRerankConfig;
  } = {},
): Promise<CoverSuggestion | null> {
  const suggestions = await suggestImageCandidatesForQuery(query, {
    ...options,
    limit: 1,
  });

  return suggestions[0] ?? null;
}
