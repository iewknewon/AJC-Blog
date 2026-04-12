type CloudflareRequest = Request & {
  cf?: Partial<IncomingRequestCfProperties>;
};

const ANALYTICS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS page_views (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  post_slug TEXT,
  ip_hash TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  continent TEXT,
  colo TEXT,
  user_agent TEXT,
  referer TEXT,
  visited_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_page_views_visited_at ON page_views(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
CREATE INDEX IF NOT EXISTS idx_page_views_post_slug ON page_views(post_slug);
CREATE INDEX IF NOT EXISTS idx_page_views_country ON page_views(country);
CREATE INDEX IF NOT EXISTS idx_page_views_ip_hash ON page_views(ip_hash);
`;

export type PageViewInput = {
  path: string;
  postSlug?: string | null;
  ipHash?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  continent?: string | null;
  colo?: string | null;
  userAgent?: string | null;
  referer?: string | null;
  visitedAt?: string;
};

export type AnalyticsSummary = {
  totalViews: number;
  uniqueVisitors: number;
  articleViews: number;
  trackedCountries: number;
};

export type TopPageStat = {
  path: string;
  views: number;
  uniqueVisitors: number;
};

export type TopPostStat = {
  slug: string;
  title: string;
  views: number;
  uniqueVisitors: number;
};

export type LocationStat = {
  country: string | null;
  region: string | null;
  city: string | null;
  views: number;
  uniqueVisitors: number;
};

export type RecentVisit = {
  path: string;
  postSlug: string | null;
  postTitle: string | null;
  ipHash: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  continent: string | null;
  colo: string | null;
  userAgent: string | null;
  referer: string | null;
  visitedAt: string;
};

function readOptionalText(value: unknown, maxLength = 255) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function readNumericValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isMissingPageViewsTableError(error: unknown) {
  return error instanceof Error && /no such table:\s*page_views/i.test(error.message);
}

async function withAnalyticsSchema<T>(db: D1Database, action: () => Promise<T>) {
  try {
    return await action();
  } catch (error) {
    if (!isMissingPageViewsTableError(error)) {
      throw error;
    }

    await db.exec(ANALYTICS_SCHEMA_SQL);
    return action();
  }
}

function normalizePathname(pathname: string) {
  const compacted = pathname.replace(/\/{2,}/g, '/').trim();
  const withoutTrailingSlash = compacted !== '/' ? compacted.replace(/\/+$/, '') : compacted;
  return withoutTrailingSlash || '/';
}

export function normalizeTrackedPath(rawPath: string, requestUrl: string) {
  const candidate = rawPath.trim();

  if (!candidate || (!candidate.startsWith('/') && !/^https?:\/\//i.test(candidate))) {
    return null;
  }

  try {
    const baseUrl = new URL(requestUrl);
    const url = new URL(candidate, baseUrl);

    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }

    if (url.origin !== baseUrl.origin) {
      return null;
    }

    const pathname = normalizePathname(url.pathname);

    if (/^\/(admin|api)(\/|$)/.test(pathname)) {
      return null;
    }

    return pathname;
  } catch {
    return null;
  }
}

export function extractTrackedPostSlug(path: string) {
  const matched = normalizePathname(path).match(/^\/blog\/([^/]+)$/);
  return matched ? decodeURIComponent(matched[1]) : null;
}

async function hashText(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashIpAddress(ipAddress?: string | null) {
  const normalized = readOptionalText(ipAddress, 128);
  return normalized ? hashText(normalized) : null;
}

function readClientIpAddress(request: Request) {
  const cfConnectingIp = request.headers.get('CF-Connecting-IP');

  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  const forwardedFor = request.headers.get('X-Forwarded-For');

  if (!forwardedFor) {
    return null;
  }

  return forwardedFor.split(',')[0]?.trim() || null;
}

export async function getPageViewInputFromRequest(request: Request, path: string): Promise<PageViewInput> {
  const cf = (request as CloudflareRequest).cf ?? {};
  const ipHash = await hashIpAddress(readClientIpAddress(request));

  return {
    path,
    postSlug: extractTrackedPostSlug(path),
    ipHash,
    country: readOptionalText(cf.country),
    region: readOptionalText(cf.region),
    city: readOptionalText(cf.city),
    continent: readOptionalText(cf.continent),
    colo: readOptionalText(cf.colo),
    userAgent: readOptionalText(request.headers.get('User-Agent'), 512),
    referer: readOptionalText(request.headers.get('Referer'), 1024),
  };
}

export async function recordPageView(db: D1Database, input: PageViewInput) {
  const visitedAt = input.visitedAt ?? new Date().toISOString();

  await withAnalyticsSchema(db, async () => {
    await db.prepare(`
      INSERT INTO page_views (
        id,
        path,
        post_slug,
        ip_hash,
        country,
        region,
        city,
        continent,
        colo,
        user_agent,
        referer,
        visited_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        crypto.randomUUID(),
        input.path,
        input.postSlug ?? null,
        input.ipHash ?? null,
        input.country ?? null,
        input.region ?? null,
        input.city ?? null,
        input.continent ?? null,
        input.colo ?? null,
        input.userAgent ?? null,
        input.referer ?? null,
        visitedAt,
      )
      .run();
  });
}

export async function getAnalyticsSummary(db: D1Database): Promise<AnalyticsSummary> {
  const row = await withAnalyticsSchema(db, () => db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM page_views) AS total_views,
        (SELECT COUNT(DISTINCT ip_hash) FROM page_views WHERE ip_hash IS NOT NULL) AS unique_visitors,
        (SELECT COUNT(*) FROM page_views WHERE post_slug IS NOT NULL AND post_slug != '') AS article_views,
        (SELECT COUNT(DISTINCT country) FROM page_views WHERE country IS NOT NULL AND country != '') AS tracked_countries
    `).first<{
      total_views: unknown;
      unique_visitors: unknown;
      article_views: unknown;
      tracked_countries: unknown;
    }>());

  return {
    totalViews: readNumericValue(row?.total_views),
    uniqueVisitors: readNumericValue(row?.unique_visitors),
    articleViews: readNumericValue(row?.article_views),
    trackedCountries: readNumericValue(row?.tracked_countries),
  };
}

export async function getTopPages(db: D1Database, limit = 10): Promise<TopPageStat[]> {
  const result = await withAnalyticsSchema(db, () => db.prepare(`
      SELECT
        path,
        COUNT(*) AS views,
        COUNT(DISTINCT ip_hash) AS unique_visitors
      FROM page_views
      GROUP BY path
      ORDER BY views DESC, path ASC
      LIMIT ?
    `)
      .bind(limit)
      .all<{
        path: string;
        views: unknown;
        unique_visitors: unknown;
      }>());

  return (result.results ?? []).map((row) => ({
    path: row.path,
    views: readNumericValue(row.views),
    uniqueVisitors: readNumericValue(row.unique_visitors),
  }));
}

export async function getTopPosts(db: D1Database, limit = 10): Promise<TopPostStat[]> {
  const result = await withAnalyticsSchema(db, () => db.prepare(`
      SELECT
        pv.post_slug AS slug,
        MAX(p.title) AS title,
        COUNT(*) AS views,
        COUNT(DISTINCT pv.ip_hash) AS unique_visitors
      FROM page_views pv
      LEFT JOIN posts p ON p.slug = pv.post_slug
      WHERE pv.post_slug IS NOT NULL AND pv.post_slug != ''
      GROUP BY pv.post_slug
      ORDER BY views DESC, pv.post_slug ASC
      LIMIT ?
    `)
      .bind(limit)
      .all<{
        slug: string;
        title: string | null;
        views: unknown;
        unique_visitors: unknown;
      }>());

  return (result.results ?? []).map((row) => ({
    slug: row.slug,
    title: row.title ?? row.slug,
    views: readNumericValue(row.views),
    uniqueVisitors: readNumericValue(row.unique_visitors),
  }));
}

export async function getLocationBreakdown(db: D1Database, limit = 12): Promise<LocationStat[]> {
  const result = await withAnalyticsSchema(db, () => db.prepare(`
      SELECT
        country,
        region,
        city,
        COUNT(*) AS views,
        COUNT(DISTINCT ip_hash) AS unique_visitors
      FROM page_views
      WHERE country IS NOT NULL OR region IS NOT NULL OR city IS NOT NULL
      GROUP BY country, region, city
      ORDER BY views DESC, country ASC, region ASC, city ASC
      LIMIT ?
    `)
      .bind(limit)
      .all<{
        country: string | null;
        region: string | null;
        city: string | null;
        views: unknown;
        unique_visitors: unknown;
      }>());

  return (result.results ?? []).map((row) => ({
    country: row.country,
    region: row.region,
    city: row.city,
    views: readNumericValue(row.views),
    uniqueVisitors: readNumericValue(row.unique_visitors),
  }));
}

export async function getRecentVisits(db: D1Database, limit = 20): Promise<RecentVisit[]> {
  const result = await withAnalyticsSchema(db, () => db.prepare(`
      SELECT
        pv.path,
        pv.post_slug,
        p.title AS post_title,
        pv.ip_hash,
        pv.country,
        pv.region,
        pv.city,
        pv.continent,
        pv.colo,
        pv.user_agent,
        pv.referer,
        pv.visited_at
      FROM page_views pv
      LEFT JOIN posts p ON p.slug = pv.post_slug
      ORDER BY pv.visited_at DESC
      LIMIT ?
    `)
      .bind(limit)
      .all<{
        path: string;
        post_slug: string | null;
        post_title: string | null;
        ip_hash: string | null;
        country: string | null;
        region: string | null;
        city: string | null;
        continent: string | null;
        colo: string | null;
        user_agent: string | null;
        referer: string | null;
        visited_at: string;
      }>());

  return (result.results ?? []).map((row) => ({
    path: row.path,
    postSlug: row.post_slug,
    postTitle: row.post_title,
    ipHash: row.ip_hash,
    country: row.country,
    region: row.region,
    city: row.city,
    continent: row.continent,
    colo: row.colo,
    userAgent: row.user_agent,
    referer: row.referer,
    visitedAt: row.visited_at,
  }));
}

export function formatLocationLabel(location: Pick<LocationStat, 'country' | 'region' | 'city'>) {
  const parts = [location.city, location.region, location.country].filter(Boolean);
  return parts.length ? parts.join(' / ') : 'Unknown';
}

export function formatIpFingerprint(ipHash?: string | null) {
  return ipHash ? ipHash.slice(0, 12) : 'Unavailable';
}
