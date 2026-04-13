import type {
  CreateNovelChapterInput,
  NormalizedNovelProjectInput,
  NovelChapter,
  NovelChapterRow,
  NovelProject,
  PublishedNovelChapter,
  PublishedNovelChapterQueryRow,
  PublishedNovelChapterSummary,
  PublishedNovelChapterSummaryQueryRow,
  PublishedNovelProject,
  PublishedNovelProjectQueryRow,
  NovelProjectQueryRow,
  NovelReferenceSource,
  NovelReferenceSourceInput,
  NovelReferenceSourceRow,
  UpsertNovelProjectInput,
} from './types';
import { mapPostRow } from '../posts/repository';

const novelSchemaReady = new WeakSet<D1Database>();
const novelSchemaPending = new WeakMap<D1Database, Promise<void>>();

const NOVEL_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS novel_projects (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    premise TEXT NOT NULL,
    genre TEXT NOT NULL DEFAULT '',
    writing_goals TEXT NOT NULL DEFAULT '',
    reference_title TEXT,
    reference_summary TEXT,
    reference_notes TEXT,
    world_bible TEXT NOT NULL DEFAULT '',
    character_bible TEXT NOT NULL DEFAULT '',
    outline TEXT NOT NULL DEFAULT '',
    style_guide TEXT NOT NULL DEFAULT '',
    continuity_notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'planning' CHECK(status IN ('planning', 'serializing', 'paused', 'completed')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS novel_reference_sources (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    snippet TEXT NOT NULL DEFAULT '',
    excerpt TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES novel_projects(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS novel_chapters (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    volume_number INTEGER NOT NULL DEFAULT 1,
    chapter_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    brief TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    continuity_delta TEXT NOT NULL DEFAULT '',
    post_id TEXT,
    post_slug TEXT,
    status TEXT NOT NULL CHECK(status IN ('draft', 'published')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES novel_projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, volume_number, chapter_number)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_novel_projects_updated_at ON novel_projects(updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_novel_reference_sources_project_id ON novel_reference_sources(project_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_novel_chapters_project_id ON novel_chapters(project_id, volume_number DESC, chapter_number DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_novel_chapters_post_id ON novel_chapters(post_id)`,
] as const;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : String(message ?? '');
  }

  return String(error ?? '');
}

function isMissingNovelTableError(error: unknown) {
  return /no such table:\s*(novel_projects|novel_chapters|novel_reference_sources)/i.test(getErrorMessage(error));
}

function readNumericValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value?: string | null) {
  return String(value ?? '').trim();
}

function normalizeOptionalText(value?: string | null) {
  const normalized = normalizeText(value);
  return normalized || null;
}

export async function ensureNovelSchema(db: D1Database) {
  if (novelSchemaReady.has(db)) {
    return;
  }

  const existingTask = novelSchemaPending.get(db);

  if (existingTask) {
    await existingTask;
    return;
  }

  const task = (async () => {
    await db.batch(NOVEL_SCHEMA_STATEMENTS.map((sql) => db.prepare(sql)));
    novelSchemaReady.add(db);
  })().finally(() => {
    novelSchemaPending.delete(db);
  });

  novelSchemaPending.set(db, task);
  await task;
}

async function withNovelSchema<T>(db: D1Database, action: () => Promise<T>) {
  await ensureNovelSchema(db);

  try {
    return await action();
  } catch (error) {
    if (!isMissingNovelTableError(error)) {
      throw error;
    }

    novelSchemaReady.delete(db);
    await ensureNovelSchema(db);
    return action();
  }
}

async function pruneOrphanedNovelChapters(db: D1Database) {
  await withNovelSchema(db, () => db.prepare(`
      DELETE FROM novel_chapters
      WHERE post_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM posts
          WHERE posts.id = novel_chapters.post_id
        )
    `).run());
}

export function normalizeNovelProjectInput(input: UpsertNovelProjectInput): NormalizedNovelProjectInput {
  return {
    slug: normalizeText(input.slug),
    title: normalizeText(input.title),
    premise: normalizeText(input.premise),
    genre: normalizeText(input.genre),
    writingGoals: normalizeText(input.writingGoals),
    referenceTitle: normalizeOptionalText(input.referenceTitle),
    referenceSummary: normalizeOptionalText(input.referenceSummary),
    referenceNotes: normalizeOptionalText(input.referenceNotes),
    worldBible: normalizeText(input.worldBible),
    characterBible: normalizeText(input.characterBible),
    outline: normalizeText(input.outline),
    styleGuide: normalizeText(input.styleGuide),
    continuityNotes: normalizeText(input.continuityNotes),
    status: input.status,
  };
}

export function mapNovelProjectRow(row: NovelProjectQueryRow): NovelProject {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    premise: row.premise,
    genre: row.genre,
    writingGoals: row.writing_goals,
    referenceTitle: row.reference_title ?? undefined,
    referenceSummary: row.reference_summary ?? undefined,
    referenceNotes: row.reference_notes ?? undefined,
    worldBible: row.world_bible,
    characterBible: row.character_bible,
    outline: row.outline,
    styleGuide: row.style_guide,
    continuityNotes: row.continuity_notes,
    status: row.status,
    chaptersCount: readNumericValue(row.chapters_count),
    lastChapterNumber: readNumericValue(row.last_chapter_number),
    lastVolumeNumber: Math.max(1, readNumericValue(row.last_volume_number, 1)),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapPublishedNovelProjectRow(row: PublishedNovelProjectQueryRow): PublishedNovelProject {
  const project = mapNovelProjectRow(row);

  return {
    ...project,
    latestPublishedAt: row.latest_published_at ? new Date(row.latest_published_at) : null,
    latestChapterTitle: row.latest_chapter_title ?? undefined,
    cover: row.cover_image ?? undefined,
  };
}

export function mapNovelChapterRow(row: NovelChapterRow): NovelChapter {
  return {
    id: row.id,
    projectId: row.project_id,
    volumeNumber: row.volume_number,
    chapterNumber: row.chapter_number,
    title: row.title,
    description: row.description,
    brief: row.brief,
    summary: row.summary,
    continuityDelta: row.continuity_delta,
    postId: row.post_id ?? undefined,
    postSlug: row.post_slug ?? undefined,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapPublishedNovelChapterSummaryRow(
  row: PublishedNovelChapterSummaryQueryRow,
): PublishedNovelChapterSummary {
  const chapter = mapNovelChapterRow(row);

  return {
    ...chapter,
    publishedAt: row.post_published_at ? new Date(row.post_published_at) : null,
    cover: row.post_cover ?? undefined,
  };
}

export function mapPublishedNovelChapterRow(row: PublishedNovelChapterQueryRow): PublishedNovelChapter {
  const chapter = mapPublishedNovelChapterSummaryRow(row);

  return {
    ...chapter,
    post: mapPostRow({
      id: row.post_id ?? '',
      slug: row.current_post_slug,
      title: row.post_title,
      description: row.post_description,
      content: row.post_content,
      tags: row.post_tags,
      cover: row.post_cover,
      featured: row.post_featured,
      status: row.post_status,
      published_at: row.post_published_at,
      created_at: row.post_created_at,
      updated_at: row.post_updated_at,
    }),
  };
}

export function mapNovelReferenceSourceRow(row: NovelReferenceSourceRow): NovelReferenceSource {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    url: row.url,
    snippet: row.snippet,
    excerpt: row.excerpt ?? undefined,
    createdAt: new Date(row.created_at),
  };
}

export function toNovelProjectInput(project: Pick<
  NovelProject,
  'slug' | 'title' | 'premise' | 'genre' | 'writingGoals' | 'referenceTitle' | 'referenceSummary' |
  'referenceNotes' | 'worldBible' | 'characterBible' | 'outline' | 'styleGuide' | 'continuityNotes' | 'status'
>) {
  return {
    slug: project.slug,
    title: project.title,
    premise: project.premise,
    genre: project.genre,
    writingGoals: project.writingGoals,
    referenceTitle: project.referenceTitle ?? null,
    referenceSummary: project.referenceSummary ?? null,
    referenceNotes: project.referenceNotes ?? null,
    worldBible: project.worldBible,
    characterBible: project.characterBible,
    outline: project.outline,
    styleGuide: project.styleGuide,
    continuityNotes: project.continuityNotes,
    status: project.status,
  } satisfies UpsertNovelProjectInput;
}

function bindNovelProjectStatement(
  statement: D1PreparedStatement,
  data: NormalizedNovelProjectInput & { id: string; createdAt: string; updatedAt: string },
) {
  return statement.bind(
    data.id,
    data.slug,
    data.title,
    data.premise,
    data.genre,
    data.writingGoals,
    data.referenceTitle,
    data.referenceSummary,
    data.referenceNotes,
    data.worldBible,
    data.characterBible,
    data.outline,
    data.styleGuide,
    data.continuityNotes,
    data.status,
    data.createdAt,
    data.updatedAt,
  );
}

const PROJECT_QUERY = `
  SELECT
    p.*,
    COUNT(c.id) AS chapters_count,
    COALESCE(MAX(c.chapter_number), 0) AS last_chapter_number,
    COALESCE(MAX(c.volume_number), 1) AS last_volume_number
  FROM novel_projects p
  LEFT JOIN novel_chapters c ON c.project_id = p.id
`;

function getPublishedNovelVisibilityClause(chapterAlias: string, postAlias: string) {
  return `
    ${chapterAlias}.post_id IS NOT NULL
    AND ${postAlias}.status = 'published'
    AND ${postAlias}.published_at IS NOT NULL
  `;
}

const PUBLISHED_PROJECT_STATS_QUERY = `
  SELECT
    p.*,
    COUNT(c.id) AS chapters_count,
    COALESCE((
      SELECT c2.chapter_number
      FROM novel_chapters c2
      INNER JOIN posts post2 ON post2.id = c2.post_id
      WHERE c2.project_id = p.id
        AND ${getPublishedNovelVisibilityClause('c2', 'post2')}
      ORDER BY c2.volume_number DESC, c2.chapter_number DESC, post2.published_at DESC
      LIMIT 1
    ), 0) AS last_chapter_number,
    COALESCE((
      SELECT c2.volume_number
      FROM novel_chapters c2
      INNER JOIN posts post2 ON post2.id = c2.post_id
      WHERE c2.project_id = p.id
        AND ${getPublishedNovelVisibilityClause('c2', 'post2')}
      ORDER BY c2.volume_number DESC, c2.chapter_number DESC, post2.published_at DESC
      LIMIT 1
    ), 1) AS last_volume_number,
    MAX(post.published_at) AS latest_published_at,
    (
      SELECT c2.title
      FROM novel_chapters c2
      INNER JOIN posts post2 ON post2.id = c2.post_id
      WHERE c2.project_id = p.id
        AND ${getPublishedNovelVisibilityClause('c2', 'post2')}
      ORDER BY c2.volume_number DESC, c2.chapter_number DESC, post2.published_at DESC
      LIMIT 1
    ) AS latest_chapter_title,
    (
      SELECT post2.cover
      FROM novel_chapters c2
      INNER JOIN posts post2 ON post2.id = c2.post_id
      WHERE c2.project_id = p.id
        AND ${getPublishedNovelVisibilityClause('c2', 'post2')}
      ORDER BY c2.volume_number ASC, c2.chapter_number ASC, post2.published_at ASC
      LIMIT 1
    ) AS cover_image
  FROM novel_projects p
  INNER JOIN novel_chapters c ON c.project_id = p.id
  INNER JOIN posts post ON post.id = c.post_id
  WHERE ${getPublishedNovelVisibilityClause('c', 'post')}
`;

export async function getNovelProjects(db: D1Database) {
  await pruneOrphanedNovelChapters(db);

  const result = await withNovelSchema(db, () => db.prepare(`
      ${PROJECT_QUERY}
      GROUP BY p.id
      ORDER BY p.updated_at DESC, p.created_at DESC
    `).all<NovelProjectQueryRow>());

  return (result.results ?? []).map(mapNovelProjectRow);
}

export async function getNovelProjectById(db: D1Database, id: string) {
  await pruneOrphanedNovelChapters(db);

  const result = await withNovelSchema(db, () => db.prepare(`
      ${PROJECT_QUERY}
      WHERE p.id = ?
      GROUP BY p.id
      LIMIT 1
    `).bind(id).first<NovelProjectQueryRow>());

  return result ? mapNovelProjectRow(result) : null;
}

export async function getNovelProjectBySlug(db: D1Database, slug: string) {
  await pruneOrphanedNovelChapters(db);

  const result = await withNovelSchema(db, () => db.prepare(`
      ${PROJECT_QUERY}
      WHERE p.slug = ?
      GROUP BY p.id
      LIMIT 1
    `).bind(slug).first<NovelProjectQueryRow>());

  return result ? mapNovelProjectRow(result) : null;
}

export async function getPublishedNovelProjects(db: D1Database) {
  await pruneOrphanedNovelChapters(db);

  const result = await withNovelSchema(db, () => db.prepare(`
      ${PUBLISHED_PROJECT_STATS_QUERY}
      GROUP BY p.id
      ORDER BY latest_published_at DESC, p.updated_at DESC, p.created_at DESC
    `).all<PublishedNovelProjectQueryRow>());

  return (result.results ?? []).map(mapPublishedNovelProjectRow);
}

export async function getPublishedNovelProjectBySlug(db: D1Database, slug: string) {
  await pruneOrphanedNovelChapters(db);

  const result = await withNovelSchema(db, () => db.prepare(`
      ${PUBLISHED_PROJECT_STATS_QUERY}
      AND p.slug = ?
      GROUP BY p.id
      LIMIT 1
    `).bind(slug).first<PublishedNovelProjectQueryRow>());

  return result ? mapPublishedNovelProjectRow(result) : null;
}

export async function createNovelProject(db: D1Database, input: UpsertNovelProjectInput) {
  const normalized = normalizeNovelProjectInput(input);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await withNovelSchema(db, () => bindNovelProjectStatement(
    db.prepare(`
      INSERT INTO novel_projects (
        id,
        slug,
        title,
        premise,
        genre,
        writing_goals,
        reference_title,
        reference_summary,
        reference_notes,
        world_bible,
        character_bible,
        outline,
        style_guide,
        continuity_notes,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    { ...normalized, id, createdAt: now, updatedAt: now },
  ).run());

  return getNovelProjectById(db, id);
}

export async function updateNovelProject(db: D1Database, id: string, input: UpsertNovelProjectInput) {
  const normalized = normalizeNovelProjectInput(input);
  const updatedAt = new Date().toISOString();

  await withNovelSchema(db, () => db.prepare(`
      UPDATE novel_projects
      SET
        slug = ?,
        title = ?,
        premise = ?,
        genre = ?,
        writing_goals = ?,
        reference_title = ?,
        reference_summary = ?,
        reference_notes = ?,
        world_bible = ?,
        character_bible = ?,
        outline = ?,
        style_guide = ?,
        continuity_notes = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .bind(
      normalized.slug,
      normalized.title,
      normalized.premise,
      normalized.genre,
      normalized.writingGoals,
      normalized.referenceTitle,
      normalized.referenceSummary,
      normalized.referenceNotes,
      normalized.worldBible,
      normalized.characterBible,
      normalized.outline,
      normalized.styleGuide,
      normalized.continuityNotes,
      normalized.status,
      updatedAt,
      id,
    )
    .run());

  return getNovelProjectById(db, id);
}

export async function deleteNovelProject(db: D1Database, id: string) {
  await withNovelSchema(db, async () => {
    await db.prepare(`DELETE FROM novel_reference_sources WHERE project_id = ?`).bind(id).run();
    await db.prepare(`DELETE FROM novel_chapters WHERE project_id = ?`).bind(id).run();
    await db.prepare(`DELETE FROM novel_projects WHERE id = ?`).bind(id).run();
  });
}

export async function getNovelReferenceSources(db: D1Database, projectId: string) {
  const result = await withNovelSchema(db, () => db.prepare(`
      SELECT *
      FROM novel_reference_sources
      WHERE project_id = ?
      ORDER BY created_at DESC, title ASC
    `)
    .bind(projectId)
    .all<NovelReferenceSourceRow>());

  return (result.results ?? []).map(mapNovelReferenceSourceRow);
}

export async function replaceNovelReferenceSources(
  db: D1Database,
  projectId: string,
  sources: NovelReferenceSourceInput[],
) {
  await withNovelSchema(db, async () => {
    await db.prepare(`DELETE FROM novel_reference_sources WHERE project_id = ?`).bind(projectId).run();

    const now = new Date().toISOString();

    for (const source of sources) {
      await db.prepare(`
        INSERT INTO novel_reference_sources (id, project_id, title, url, snippet, excerpt, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(
          crypto.randomUUID(),
          projectId,
          normalizeText(source.title),
          normalizeText(source.url),
          normalizeText(source.snippet),
          normalizeOptionalText(source.excerpt),
          now,
        )
        .run();
    }
  });

  return getNovelReferenceSources(db, projectId);
}

export async function getNovelChaptersByProjectId(db: D1Database, projectId: string) {
  await pruneOrphanedNovelChapters(db);

  const result = await withNovelSchema(db, () => db.prepare(`
      SELECT *
      FROM novel_chapters
      WHERE project_id = ?
      ORDER BY volume_number DESC, chapter_number DESC, created_at DESC
    `)
    .bind(projectId)
    .all<NovelChapterRow>());

  return (result.results ?? []).map(mapNovelChapterRow);
}

export async function getNovelChapterById(db: D1Database, chapterId: string) {
  await pruneOrphanedNovelChapters(db);

  const row = await withNovelSchema(db, () => db.prepare(`
      SELECT *
      FROM novel_chapters
      WHERE id = ?
      LIMIT 1
    `)
    .bind(chapterId)
    .first<NovelChapterRow>());

  return row ? mapNovelChapterRow(row) : null;
}

export async function getNovelChapterByPostId(db: D1Database, postId: string) {
  await pruneOrphanedNovelChapters(db);

  const row = await withNovelSchema(db, () => db.prepare(`
      SELECT *
      FROM novel_chapters
      WHERE post_id = ?
      LIMIT 1
    `)
    .bind(postId)
    .first<NovelChapterRow>());

  return row ? mapNovelChapterRow(row) : null;
}

export async function getNovelChapterPostIds(db: D1Database) {
  await pruneOrphanedNovelChapters(db);

  const result = await withNovelSchema(db, () => db.prepare(`
      SELECT DISTINCT post_id
      FROM novel_chapters
      WHERE post_id IS NOT NULL AND post_id != ''
    `).all<{ post_id: string | null }>());

  return (result.results ?? [])
    .map((row) => row.post_id)
    .filter((postId): postId is string => typeof postId === 'string' && postId.length > 0);
}

export async function createNovelChapter(db: D1Database, input: CreateNovelChapterInput) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await withNovelSchema(db, () => db.prepare(`
      INSERT INTO novel_chapters (
        id,
        project_id,
        volume_number,
        chapter_number,
        title,
        description,
        brief,
        summary,
        continuity_delta,
        post_id,
        post_slug,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      id,
      input.projectId,
      Math.max(1, Math.round(input.volumeNumber ?? 1)),
      Math.max(1, Math.round(input.chapterNumber)),
      normalizeText(input.title),
      normalizeText(input.description),
      normalizeText(input.brief),
      normalizeText(input.summary),
      normalizeText(input.continuityDelta),
      normalizeOptionalText(input.postId),
      normalizeOptionalText(input.postSlug),
      input.status,
      now,
      now,
    )
    .run());

  const row = await withNovelSchema(db, () => db.prepare(`
      SELECT *
      FROM novel_chapters
      WHERE id = ?
      LIMIT 1
    `).bind(id).first<NovelChapterRow>());

  return row ? mapNovelChapterRow(row) : null;
}

export async function getPublishedNovelChapterSummariesByProjectId(db: D1Database, projectId: string) {
  const result = await withNovelSchema(db, () => db.prepare(`
      SELECT
        c.*,
        post.published_at AS post_published_at,
        post.cover AS post_cover
      FROM novel_chapters c
      INNER JOIN posts post ON post.id = c.post_id
      WHERE c.project_id = ?
        AND ${getPublishedNovelVisibilityClause('c', 'post')}
      ORDER BY c.volume_number ASC, c.chapter_number ASC, post.published_at ASC
    `)
    .bind(projectId)
    .all<PublishedNovelChapterSummaryQueryRow>());

  return (result.results ?? []).map(mapPublishedNovelChapterSummaryRow);
}

export async function getPublishedNovelChapterByPosition(
  db: D1Database,
  projectId: string,
  volumeNumber: number,
  chapterNumber: number,
) {
  const row = await withNovelSchema(db, () => db.prepare(`
      SELECT
        c.*,
        post.slug AS current_post_slug,
        post.title AS post_title,
        post.description AS post_description,
        post.content AS post_content,
        post.tags AS post_tags,
        post.cover AS post_cover,
        post.featured AS post_featured,
        post.status AS post_status,
        post.published_at AS post_published_at,
        post.created_at AS post_created_at,
        post.updated_at AS post_updated_at
      FROM novel_chapters c
      INNER JOIN posts post ON post.id = c.post_id
      WHERE c.project_id = ?
        AND c.volume_number = ?
        AND c.chapter_number = ?
        AND ${getPublishedNovelVisibilityClause('c', 'post')}
      LIMIT 1
    `)
    .bind(projectId, Math.max(1, Math.round(volumeNumber)), Math.max(1, Math.round(chapterNumber)))
    .first<PublishedNovelChapterQueryRow>());

  return row ? mapPublishedNovelChapterRow(row) : null;
}

export async function getPublishedNovelPostIds(db: D1Database) {
  const result = await withNovelSchema(db, () => db.prepare(`
      SELECT DISTINCT c.post_id
      FROM novel_chapters c
      INNER JOIN posts post ON post.id = c.post_id
      WHERE ${getPublishedNovelVisibilityClause('c', 'post')}
    `).all<{ post_id: string | null }>());

  return (result.results ?? [])
    .map((row) => row.post_id)
    .filter((postId): postId is string => typeof postId === 'string' && postId.length > 0);
}

export async function getPublishedNovelChapterRouteByPostSlug(db: D1Database, postSlug: string) {
  const row = await withNovelSchema(db, () => db.prepare(`
      SELECT
        p.slug AS project_slug,
        c.volume_number,
        c.chapter_number
      FROM novel_chapters c
      INNER JOIN novel_projects p ON p.id = c.project_id
      INNER JOIN posts post ON post.id = c.post_id
      WHERE post.slug = ?
        AND ${getPublishedNovelVisibilityClause('c', 'post')}
      LIMIT 1
    `)
    .bind(postSlug)
    .first<{
      project_slug: string;
      volume_number: number;
      chapter_number: number;
    }>());

  if (!row) {
    return null;
  }

  return {
    projectSlug: row.project_slug,
    volumeNumber: row.volume_number,
    chapterNumber: row.chapter_number,
  };
}

export async function syncNovelChapterByPost(
  db: D1Database,
  post: Pick<BlogPost, 'id' | 'slug' | 'status'>,
) {
  await withNovelSchema(db, () => db.prepare(`
      UPDATE novel_chapters
      SET
        post_slug = ?,
        status = ?,
        updated_at = ?
      WHERE post_id = ?
    `)
    .bind(
      post.slug,
      post.status,
      new Date().toISOString(),
      post.id,
    )
    .run());
}

export async function deleteNovelChapterByPostId(db: D1Database, postId: string) {
  await withNovelSchema(db, () => db.prepare(`
      DELETE FROM novel_chapters
      WHERE post_id = ?
    `)
    .bind(postId)
    .run());
}
