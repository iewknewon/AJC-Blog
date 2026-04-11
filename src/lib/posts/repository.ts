import type { BlogPost, NormalizedPostInput, PostRow, UpsertPostInput } from './types';

const PUBLISHED_STATUS = 'published';

function normalizeTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

export function serializeTags(tags: string[]) {
  return JSON.stringify(normalizeTags(tags));
}

function parseTags(tags: string) {
  const parsed = JSON.parse(tags);
  return Array.isArray(parsed) ? parsed.filter((tag) => typeof tag === 'string') : [];
}

export function mapPostRow(row: PostRow): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    content: row.content,
    tags: parseTags(row.tags),
    cover: row.cover ?? undefined,
    featured: row.featured === 1,
    status: row.status,
    publishedAt: row.published_at ? new Date(row.published_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function normalizePostInput(input: UpsertPostInput): NormalizedPostInput {
  const publishedAt = input.status === PUBLISHED_STATUS
    ? (input.publishedAt ?? new Date().toISOString())
    : null;

  return {
    slug: input.slug.trim(),
    title: input.title.trim(),
    description: input.description.trim(),
    content: input.content,
    tags: normalizeTags(input.tags),
    cover: input.cover?.trim() || null,
    featured: input.featured ? 1 : 0,
    status: input.status,
    publishedAt,
  };
}

function bindPostStatement(statement: D1PreparedStatement, data: NormalizedPostInput & { id: string; createdAt: string; updatedAt: string }) {
  return statement.bind(
    data.id,
    data.slug,
    data.title,
    data.description,
    data.content,
    serializeTags(data.tags),
    data.cover,
    data.featured,
    data.status,
    data.publishedAt,
    data.createdAt,
    data.updatedAt,
  );
}

export async function getPublishedPostBySlug(db: D1Database, slug: string) {
  const result = await db
    .prepare(`SELECT * FROM posts WHERE slug = ? AND status = 'published' AND published_at IS NOT NULL LIMIT 1`)
    .bind(slug)
    .first<PostRow>();

  return result ? mapPostRow(result) : null;
}

export async function getPublishedPosts(db: D1Database) {
  const result = await db
    .prepare(`SELECT * FROM posts WHERE status = 'published' AND published_at IS NOT NULL ORDER BY published_at DESC, updated_at DESC`)
    .all<PostRow>();

  return (result.results ?? []).map(mapPostRow);
}

export async function getAdminPosts(db: D1Database) {
  const result = await db
    .prepare(`SELECT * FROM posts ORDER BY updated_at DESC, created_at DESC`)
    .all<PostRow>();

  return (result.results ?? []).map(mapPostRow);
}

export async function getPostById(db: D1Database, id: string) {
  const result = await db.prepare(`SELECT * FROM posts WHERE id = ? LIMIT 1`).bind(id).first<PostRow>();
  return result ? mapPostRow(result) : null;
}

export async function createPost(db: D1Database, input: UpsertPostInput) {
  const normalized = normalizePostInput(input);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await bindPostStatement(
    db.prepare(`
      INSERT INTO posts (id, slug, title, description, content, tags, cover, featured, status, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    { ...normalized, id, createdAt: now, updatedAt: now },
  ).run();

  return getPostById(db, id);
}

export async function updatePost(db: D1Database, id: string, input: UpsertPostInput) {
  const normalized = normalizePostInput(input);
  const updatedAt = new Date().toISOString();

  await db.prepare(`
    UPDATE posts
    SET slug = ?, title = ?, description = ?, content = ?, tags = ?, cover = ?, featured = ?, status = ?, published_at = ?, updated_at = ?
    WHERE id = ?
  `)
    .bind(
      normalized.slug,
      normalized.title,
      normalized.description,
      normalized.content,
      serializeTags(normalized.tags),
      normalized.cover,
      normalized.featured,
      normalized.status,
      normalized.publishedAt,
      updatedAt,
      id,
    )
    .run();

  return getPostById(db, id);
}

export async function getPostsByTag(db: D1Database, tag: string) {
  const normalizedTag = tag.trim().toLowerCase();
  const posts = await getPublishedPosts(db);
  return posts.filter((post) => post.tags.some((item) => item.toLowerCase() === normalizedTag));
}

export async function searchPublishedPosts(db: D1Database, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return [];
  }

  const posts = await getPublishedPosts(db);
  return posts.filter((post) => {
    const searchableText = [post.title, post.description, ...post.tags, post.content].join(' ').toLowerCase();
    return searchableText.includes(normalizedKeyword);
  });
}

export async function getAdjacentPublishedPosts(db: D1Database, slug: string) {
  const posts = await getPublishedPosts(db);
  const index = posts.findIndex((post) => post.slug === slug);

  return {
    previous: index < posts.length - 1 ? posts[index + 1] : undefined,
    next: index > 0 ? posts[index - 1] : undefined,
  };
}
