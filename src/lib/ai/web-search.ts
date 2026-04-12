export type WebResearchSource = {
  title: string;
  url: string;
  snippet: string;
  excerpt?: string;
};

export type WebResearchContext = {
  query: string;
  sources: WebResearchSource[];
};

type FetchLike = typeof fetch;

const SEARCH_ENDPOINT = 'https://www.bing.com/search?format=rss&mkt=zh-CN&q=';
const SEARCH_TIMEOUT_MS = 12_000;
const PAGE_TIMEOUT_MS = 10_000;
const DEFAULT_SEARCH_LIMIT = 5;
const DEFAULT_PAGE_FETCH_LIMIT = 3;
const SNIPPET_LIMIT = 240;
const EXCERPT_LIMIT = 1_200;

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

export async function collectWebResearch(
  query: string,
  options: {
    searchLimit?: number;
    pageFetchLimit?: number;
    fetchImpl?: FetchLike;
  } = {},
): Promise<WebResearchContext> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return {
      query: '',
      sources: [],
    };
  }

  const searchLimit = Math.max(1, options.searchLimit ?? DEFAULT_SEARCH_LIMIT);
  const pageFetchLimit = Math.max(0, options.pageFetchLimit ?? DEFAULT_PAGE_FETCH_LIMIT);
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
  const baseSources = parseBingSearchResults(xml).slice(0, searchLimit);

  if (!baseSources.length) {
    return {
      query: normalizedQuery,
      sources: [],
    };
  }

  const enrichedSources = await Promise.all(
    baseSources.map(async (source, index) => {
      if (index >= pageFetchLimit) {
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

  return {
    query: normalizedQuery,
    sources: enrichedSources,
  };
}
