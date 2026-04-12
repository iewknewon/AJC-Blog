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
};

const OPENVERSE_ENDPOINT = 'https://api.openverse.org/v1/images/';
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
  const shortDescription = description.split(/[。！？.!?]/)[0]?.trim() ?? '';
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

function buildLicenseLabel(item: OpenverseImageResult) {
  const license = collapseWhitespace(String(item.license ?? ''));
  const version = collapseWhitespace(String(item.license_version ?? ''));

  if (!license) {
    return '';
  }

  return `${license.toUpperCase()}${version ? ` ${version}` : ''}`;
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

function scoreImageCandidate(item: OpenverseImageResult, query: string) {
  const title = collapseWhitespace(String(item.title ?? '')).toLowerCase();
  const queryTokens = extractLatinTokens(query);
  const matchedTokens = queryTokens.filter((token) => title.includes(token)).length;
  const relevanceScore = queryTokens.length ? matchedTokens / queryTokens.length : 0.2;
  const aspectRatio = typeof item.width === 'number' && typeof item.height === 'number' && item.height > 0
    ? item.width / item.height
    : null;
  const aspectScore = aspectRatio ? Math.max(0, 1 - Math.abs(aspectRatio - 16 / 9) / 1.4) : 0.35;
  const sizeScore = typeof item.width === 'number' && typeof item.height === 'number'
    ? Math.min((item.width * item.height) / (1600 * 900), 1)
    : 0.25;
  const license = String(item.license ?? '').toLowerCase();
  const licenseScore = license === 'cc0' || license === 'pdm' ? 0.8 : 0;

  return relevanceScore * 4 + aspectScore * 2 + sizeScore + licenseScore;
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

  return (data.results ?? []).filter((item) => isHttpUrl(item.thumbnail) || isHttpUrl(item.url));
}

function toCoverSuggestion(item: OpenverseImageResult, query: string, queryMode: 'ai' | 'heuristic'): CoverSuggestion | null {
  const previewUrl = isHttpUrl(item.thumbnail) ? String(item.thumbnail) : '';
  const coverUrl = previewUrl || (isHttpUrl(item.url) ? String(item.url) : '');

  if (!coverUrl) {
    return null;
  }

  return {
    query,
    coverUrl,
    previewUrl: previewUrl || coverUrl,
    title: collapseWhitespace(String(item.title ?? '未命名图片')) || '未命名图片',
    creator: collapseWhitespace(String(item.creator ?? '')) || undefined,
    creatorUrl: isHttpUrl(item.creator_url) ? String(item.creator_url) : undefined,
    license: buildLicenseLabel(item) || undefined,
    sourceUrl: isHttpUrl(item.foreign_landing_url) ? String(item.foreign_landing_url) : (isHttpUrl(item.url) ? String(item.url) : undefined),
    width: typeof item.width === 'number' ? item.width : undefined,
    height: typeof item.height === 'number' ? item.height : undefined,
    queryMode,
  };
}

export async function suggestCoverFromContent(
  input: CoverSuggestionInput,
  options: {
    fetchImpl?: FetchLike;
    preferredQueries?: string[];
  } = {},
): Promise<CoverSuggestion | null> {
  const preferredQueries = (options.preferredQueries ?? []).map((item) => collapseWhitespace(String(item))).filter(Boolean);
  const heuristicQueries = buildCoverSearchQueries(input);
  const queries = dedupeQueries([...preferredQueries, ...heuristicQueries]);

  if (!queries.length) {
    return null;
  }

  const fetchImpl = options.fetchImpl ?? fetch;

  for (const query of queries) {
    const queryMode = preferredQueries.some((item) => item.toLowerCase() === query.toLowerCase()) ? 'ai' : 'heuristic';
    const results = await searchOpenverseImages(query, fetchImpl);

    if (!results.length) {
      continue;
    }

    const bestMatch = [...results]
      .sort((left, right) => scoreImageCandidate(right, query) - scoreImageCandidate(left, query))
      .map((item) => toCoverSuggestion(item, query, queryMode))
      .find((item): item is CoverSuggestion => Boolean(item));

    if (bestMatch) {
      return bestMatch;
    }
  }

  return null;
}
