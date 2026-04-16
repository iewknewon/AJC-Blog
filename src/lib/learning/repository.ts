import type {
  LearningLessonRow,
  LearningTrackQueryRow,
  LearningTrackStatus,
  ManagedLearningLesson,
  ManagedLearningSubject,
  NormalizedLearningLessonInput,
  NormalizedLearningTrackInput,
  UpsertLearningLessonInput,
  UpsertLearningTrackInput,
} from './types';

const learningSchemaReady = new WeakSet<D1Database>();
const learningSchemaPending = new WeakMap<D1Database, Promise<void>>();

const LEARNING_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS learning_tracks (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    short_title TEXT NOT NULL,
    description TEXT NOT NULL,
    stage_slug TEXT NOT NULL,
    eyebrow TEXT NOT NULL DEFAULT 'Learning Track',
    color_token TEXT NOT NULL DEFAULT 'learning',
    icon TEXT NOT NULL DEFAULT 'LR',
    page_variant TEXT NOT NULL DEFAULT 'default' CHECK(page_variant IN ('default', 'timeline')),
    learning_path_json TEXT NOT NULL DEFAULT '[]',
    concept_overview_json TEXT,
    source_prompt TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS learning_lessons (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL,
    lesson_slug TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    estimated_minutes INTEGER NOT NULL DEFAULT 10,
    objectives_json TEXT NOT NULL DEFAULT '[]',
    keywords_json TEXT NOT NULL DEFAULT '[]',
    chat_context_summary TEXT NOT NULL DEFAULT '',
    related_lesson_slugs_json TEXT NOT NULL DEFAULT '[]',
    animation_kind TEXT NOT NULL,
    hero_summary TEXT NOT NULL DEFAULT '',
    sections_json TEXT NOT NULL DEFAULT '[]',
    misconceptions_json TEXT NOT NULL DEFAULT '[]',
    quiz_json TEXT NOT NULL DEFAULT '[]',
    quick_prompts_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (track_id) REFERENCES learning_tracks(id) ON DELETE CASCADE,
    UNIQUE(track_id, lesson_slug),
    UNIQUE(track_id, order_index)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_learning_tracks_stage ON learning_tracks(stage_slug, status, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_learning_lessons_track ON learning_lessons(track_id, order_index ASC, updated_at DESC)`,
] as const;

export function serializeLearningJson(value: unknown) {
  return JSON.stringify(value);
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

function parseJsonValue<T>(value: string | null | undefined, fallback: T) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error ?? '');
}

function isMissingLearningTableError(error: unknown) {
  return /no such table:\s*(learning_tracks|learning_lessons)/i.test(getErrorMessage(error));
}

export function normalizeLearningTrackInput(input: UpsertLearningTrackInput): NormalizedLearningTrackInput {
  return {
    slug: normalizeText(input.slug),
    title: normalizeText(input.title),
    shortTitle: normalizeText(input.shortTitle),
    description: normalizeText(input.description),
    stageSlug: input.stageSlug,
    eyebrow: normalizeText(input.eyebrow) || 'Learning Track',
    colorToken: normalizeText(input.colorToken) || 'learning',
    icon: normalizeText(input.icon) || 'LR',
    pageVariant: input.pageVariant === 'timeline' ? 'timeline' : 'default',
    learningPath: input.learningPath.map((item) => normalizeText(item)).filter(Boolean),
    conceptOverview: input.conceptOverview ?? null,
    sourcePrompt: normalizeOptionalText(input.sourcePrompt),
    status: input.status,
  };
}

export function normalizeLearningLessonInput(input: UpsertLearningLessonInput): NormalizedLearningLessonInput {
  return {
    trackId: normalizeText(input.trackId),
    lessonSlug: normalizeText(input.lessonSlug),
    title: normalizeText(input.title),
    description: normalizeText(input.description),
    order: Math.max(1, Math.round(input.order)),
    estimatedMinutes: Math.max(1, Math.round(input.estimatedMinutes)),
    objectives: input.objectives.map((item) => normalizeText(item)).filter(Boolean),
    keywords: input.keywords.map((item) => normalizeText(item)).filter(Boolean),
    chatContextSummary: normalizeText(input.chatContextSummary),
    relatedLessonSlugs: input.relatedLessonSlugs.map((item) => normalizeText(item)).filter(Boolean),
    animation: input.animation,
    heroSummary: normalizeText(input.heroSummary),
    sections: input.sections
      .map((section) => ({
        title: normalizeText(section.title),
        paragraphs: section.paragraphs.map((item) => normalizeText(item)).filter(Boolean),
      }))
      .filter((section) => section.title && section.paragraphs.length > 0),
    misconceptions: input.misconceptions
      .map((item) => ({
        myth: normalizeText(item.myth),
        clarification: normalizeText(item.clarification),
      }))
      .filter((item) => item.myth && item.clarification),
    quiz: input.quiz
      .map((item) => ({
        question: normalizeText(item.question),
        options: item.options.map((option) => normalizeText(option)).filter(Boolean),
        answerIndex: Math.max(0, Math.round(item.answerIndex)),
        explanation: normalizeText(item.explanation),
      }))
      .filter((item) => item.question && item.options.length >= 2 && item.answerIndex < item.options.length && item.explanation),
    quickPrompts: input.quickPrompts.map((item) => normalizeText(item)).filter(Boolean),
    status: input.status,
  };
}

export function mapLearningTrackRow(
  row: LearningTrackQueryRow,
  lessons: ManagedLearningLesson[] = [],
): ManagedLearningSubject {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortTitle: row.short_title,
    description: row.description,
    eyebrow: row.eyebrow,
    colorToken: row.color_token,
    icon: row.icon,
    pageVariant: row.page_variant,
    learningPath: parseJsonValue<string[]>(row.learning_path_json, []),
    conceptOverview: parseJsonValue(row.concept_overview_json, null),
    lessons,
    stageSlug: row.stage_slug,
    status: row.status,
    sourcePrompt: row.source_prompt ?? undefined,
    lessonsCount: readNumericValue(row.lessons_count, lessons.length),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapLearningLessonRow(row: LearningLessonRow): ManagedLearningLesson {
  return {
    id: row.id,
    trackId: row.track_id,
    subject: 'networking',
    lessonSlug: row.lesson_slug,
    title: row.title,
    description: row.description,
    order: row.order_index,
    estimatedMinutes: row.estimated_minutes,
    objectives: parseJsonValue(row.objectives_json, []),
    keywords: parseJsonValue(row.keywords_json, []),
    chatContextSummary: row.chat_context_summary,
    relatedLessonSlugs: parseJsonValue(row.related_lesson_slugs_json, []),
    animation: row.animation_kind,
    heroSummary: row.hero_summary,
    sections: parseJsonValue(row.sections_json, []),
    misconceptions: parseJsonValue(row.misconceptions_json, []),
    quiz: parseJsonValue(row.quiz_json, []),
    quickPrompts: parseJsonValue(row.quick_prompts_json, []),
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function toLearningTrackInput(track: Pick<
  ManagedLearningSubject,
  | 'slug'
  | 'title'
  | 'shortTitle'
  | 'description'
  | 'stageSlug'
  | 'eyebrow'
  | 'colorToken'
  | 'icon'
  | 'pageVariant'
  | 'learningPath'
  | 'conceptOverview'
  | 'sourcePrompt'
  | 'status'
>): UpsertLearningTrackInput {
  return {
    slug: track.slug,
    title: track.title,
    shortTitle: track.shortTitle,
    description: track.description,
    stageSlug: track.stageSlug,
    eyebrow: track.eyebrow,
    colorToken: track.colorToken,
    icon: track.icon,
    pageVariant: track.pageVariant ?? 'default',
    learningPath: track.learningPath,
    conceptOverview: track.conceptOverview ?? null,
    sourcePrompt: track.sourcePrompt ?? null,
    status: track.status,
  };
}

export function toLearningLessonInput(lesson: Pick<
  ManagedLearningLesson,
  | 'trackId'
  | 'lessonSlug'
  | 'title'
  | 'description'
  | 'order'
  | 'estimatedMinutes'
  | 'objectives'
  | 'keywords'
  | 'chatContextSummary'
  | 'relatedLessonSlugs'
  | 'animation'
  | 'heroSummary'
  | 'sections'
  | 'misconceptions'
  | 'quiz'
  | 'quickPrompts'
  | 'status'
>): UpsertLearningLessonInput {
  return {
    trackId: lesson.trackId,
    lessonSlug: lesson.lessonSlug,
    title: lesson.title,
    description: lesson.description,
    order: lesson.order,
    estimatedMinutes: lesson.estimatedMinutes,
    objectives: lesson.objectives,
    keywords: lesson.keywords,
    chatContextSummary: lesson.chatContextSummary,
    relatedLessonSlugs: lesson.relatedLessonSlugs,
    animation: lesson.animation,
    heroSummary: lesson.heroSummary,
    sections: lesson.sections,
    misconceptions: lesson.misconceptions,
    quiz: lesson.quiz,
    quickPrompts: lesson.quickPrompts,
    status: lesson.status,
  };
}

function attachSubjectSlugToLesson(subjectSlug: string, lesson: ManagedLearningLesson): ManagedLearningLesson {
  return {
    ...lesson,
    subject: subjectSlug as ManagedLearningLesson['subject'],
  };
}

export async function ensureLearningSchema(db: D1Database) {
  if (learningSchemaReady.has(db)) {
    return;
  }

  const existingTask = learningSchemaPending.get(db);

  if (existingTask) {
    await existingTask;
    return;
  }

  const task = (async () => {
    await db.batch(LEARNING_SCHEMA_STATEMENTS.map((sql) => db.prepare(sql)));
    learningSchemaReady.add(db);
  })().finally(() => {
    learningSchemaPending.delete(db);
  });

  learningSchemaPending.set(db, task);
  await task;
}

async function withLearningSchema<T>(db: D1Database, action: () => Promise<T>) {
  await ensureLearningSchema(db);

  try {
    return await action();
  } catch (error) {
    if (!isMissingLearningTableError(error)) {
      throw error;
    }

    learningSchemaReady.delete(db);
    await ensureLearningSchema(db);
    return action();
  }
}

export async function getLearningLessonsByTrackId(db: D1Database, trackId: string) {
  const result = await withLearningSchema(db, () => db.prepare(`
      SELECT *
      FROM learning_lessons
      WHERE track_id = ?
      ORDER BY order_index ASC, updated_at DESC
    `)
    .bind(trackId)
    .all<LearningLessonRow>());

  return (result.results ?? []).map(mapLearningLessonRow);
}

export async function getLearningLessonById(db: D1Database, lessonId: string) {
  const row = await withLearningSchema(db, () => db.prepare(`
      SELECT *
      FROM learning_lessons
      WHERE id = ?
      LIMIT 1
    `)
    .bind(lessonId)
    .first<LearningLessonRow>());

  if (!row) {
    return null;
  }

  const track = await getLearningTrackById(db, row.track_id);
  return attachSubjectSlugToLesson(track?.slug ?? 'networking', mapLearningLessonRow(row));
}

async function getLearningTrackRowByWhere(
  db: D1Database,
  whereSql: string,
  bindings: unknown[],
) {
  return withLearningSchema(db, () => db.prepare(`
      SELECT
        t.*,
        COUNT(l.id) AS lessons_count
      FROM learning_tracks t
      LEFT JOIN learning_lessons l ON l.track_id = t.id
      ${whereSql}
      GROUP BY t.id
      LIMIT 1
    `)
    .bind(...bindings)
    .first<LearningTrackQueryRow>());
}

async function getLearningTrackRows(
  db: D1Database,
  status?: LearningTrackStatus,
) {
  const sql = status
    ? `
      SELECT
        t.*,
        COUNT(l.id) AS lessons_count
      FROM learning_tracks t
      LEFT JOIN learning_lessons l ON l.track_id = t.id
      WHERE t.status = ?
      GROUP BY t.id
      ORDER BY t.updated_at DESC, t.created_at DESC
    `
    : `
      SELECT
        t.*,
        COUNT(l.id) AS lessons_count
      FROM learning_tracks t
      LEFT JOIN learning_lessons l ON l.track_id = t.id
      GROUP BY t.id
      ORDER BY t.updated_at DESC, t.created_at DESC
    `;

  const result = await withLearningSchema(db, () => status
    ? db.prepare(sql).bind(status).all<LearningTrackQueryRow>()
    : db.prepare(sql).all<LearningTrackQueryRow>());

  return result.results ?? [];
}

async function mapTrackRowWithLessons(db: D1Database, row: LearningTrackQueryRow) {
  const lessons = (await getLearningLessonsByTrackId(db, row.id))
    .map((lesson) => attachSubjectSlugToLesson(row.slug, lesson));

  return mapLearningTrackRow(row, lessons);
}

export async function getLearningTrackById(db: D1Database, id: string) {
  const row = await getLearningTrackRowByWhere(db, 'WHERE t.id = ?', [id]);

  if (!row) {
    return null;
  }

  return mapTrackRowWithLessons(db, row);
}

export async function getLearningTrackBySlug(db: D1Database, slug: string) {
  const row = await getLearningTrackRowByWhere(db, 'WHERE t.slug = ?', [slug]);

  if (!row) {
    return null;
  }

  return mapTrackRowWithLessons(db, row);
}

export async function getPublishedLearningTrackBySlug(db: D1Database, slug: string) {
  const row = await getLearningTrackRowByWhere(db, 'WHERE t.slug = ? AND t.status = ?', [slug, 'published']);

  if (!row) {
    return null;
  }

  const lessons = (await getLearningLessonsByTrackId(db, row.id))
    .filter((lesson) => lesson.status === 'published')
    .map((lesson) => attachSubjectSlugToLesson(row.slug, lesson));

  return mapLearningTrackRow({
    ...row,
    lessons_count: lessons.length,
  }, lessons);
}

export async function getLearningTracks(db: D1Database) {
  const rows = await getLearningTrackRows(db);
  return Promise.all(rows.map((row) => mapTrackRowWithLessons(db, row)));
}

export async function getPublishedLearningTracks(db: D1Database) {
  const rows = await getLearningTrackRows(db, 'published');
  return Promise.all(rows.map((row) => getPublishedLearningTrackBySlug(db, row.slug)))
    .then((tracks) => tracks.filter((track): track is ManagedLearningSubject => Boolean(track)));
}

export async function createLearningTrack(db: D1Database, input: UpsertLearningTrackInput) {
  const normalized = normalizeLearningTrackInput(input);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await withLearningSchema(db, () => db.prepare(`
      INSERT INTO learning_tracks (
        id,
        slug,
        title,
        short_title,
        description,
        stage_slug,
        eyebrow,
        color_token,
        icon,
        page_variant,
        learning_path_json,
        concept_overview_json,
        source_prompt,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      id,
      normalized.slug,
      normalized.title,
      normalized.shortTitle,
      normalized.description,
      normalized.stageSlug,
      normalized.eyebrow,
      normalized.colorToken,
      normalized.icon,
      normalized.pageVariant,
      serializeLearningJson(normalized.learningPath),
      normalized.conceptOverview ? serializeLearningJson(normalized.conceptOverview) : null,
      normalized.sourcePrompt,
      normalized.status,
      now,
      now,
    )
    .run());

  return getLearningTrackById(db, id);
}

export async function updateLearningTrack(db: D1Database, id: string, input: UpsertLearningTrackInput) {
  const normalized = normalizeLearningTrackInput(input);
  const updatedAt = new Date().toISOString();

  await withLearningSchema(db, () => db.prepare(`
      UPDATE learning_tracks
      SET
        slug = ?,
        title = ?,
        short_title = ?,
        description = ?,
        stage_slug = ?,
        eyebrow = ?,
        color_token = ?,
        icon = ?,
        page_variant = ?,
        learning_path_json = ?,
        concept_overview_json = ?,
        source_prompt = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .bind(
      normalized.slug,
      normalized.title,
      normalized.shortTitle,
      normalized.description,
      normalized.stageSlug,
      normalized.eyebrow,
      normalized.colorToken,
      normalized.icon,
      normalized.pageVariant,
      serializeLearningJson(normalized.learningPath),
      normalized.conceptOverview ? serializeLearningJson(normalized.conceptOverview) : null,
      normalized.sourcePrompt,
      normalized.status,
      updatedAt,
      id,
    )
    .run());

  return getLearningTrackById(db, id);
}

export async function createLearningLesson(db: D1Database, input: UpsertLearningLessonInput) {
  const normalized = normalizeLearningLessonInput(input);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await withLearningSchema(db, () => db.prepare(`
      INSERT INTO learning_lessons (
        id,
        track_id,
        lesson_slug,
        title,
        description,
        order_index,
        estimated_minutes,
        objectives_json,
        keywords_json,
        chat_context_summary,
        related_lesson_slugs_json,
        animation_kind,
        hero_summary,
        sections_json,
        misconceptions_json,
        quiz_json,
        quick_prompts_json,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      id,
      normalized.trackId,
      normalized.lessonSlug,
      normalized.title,
      normalized.description,
      normalized.order,
      normalized.estimatedMinutes,
      serializeLearningJson(normalized.objectives),
      serializeLearningJson(normalized.keywords),
      normalized.chatContextSummary,
      serializeLearningJson(normalized.relatedLessonSlugs),
      normalized.animation,
      normalized.heroSummary,
      serializeLearningJson(normalized.sections),
      serializeLearningJson(normalized.misconceptions),
      serializeLearningJson(normalized.quiz),
      serializeLearningJson(normalized.quickPrompts),
      normalized.status,
      now,
      now,
    )
    .run());

  const row = await withLearningSchema(db, () => db.prepare(`
      SELECT *
      FROM learning_lessons
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first<LearningLessonRow>());

  if (!row) {
    return null;
  }

  const track = await getLearningTrackById(db, row.track_id);
  const lesson = mapLearningLessonRow(row);

  return {
    ...lesson,
    subject: (track?.slug ?? 'networking') as ManagedLearningLesson['subject'],
  };
}

export async function getPublishedLearningLessons(db: D1Database) {
  const tracks = await getPublishedLearningTracks(db);
  return tracks.flatMap((track) => track.lessons.map((lesson) => attachSubjectSlugToLesson(track.slug, lesson)));
}

export async function getPublishedLearningLessonByTrackSlug(
  db: D1Database,
  trackSlug: string,
  lessonSlug: string,
) {
  const track = await getPublishedLearningTrackBySlug(db, trackSlug);

  if (!track) {
    return null;
  }

  const lesson = track.lessons.find((item) => item.lessonSlug === lessonSlug) ?? null;

  if (!lesson) {
    return null;
  }

  return {
    subject: track,
    lesson,
  };
}

export async function updateLearningLesson(db: D1Database, lessonId: string, input: UpsertLearningLessonInput) {
  const normalized = normalizeLearningLessonInput(input);
  const updatedAt = new Date().toISOString();

  await withLearningSchema(db, () => db.prepare(`
      UPDATE learning_lessons
      SET
        lesson_slug = ?,
        title = ?,
        description = ?,
        order_index = ?,
        estimated_minutes = ?,
        objectives_json = ?,
        keywords_json = ?,
        chat_context_summary = ?,
        related_lesson_slugs_json = ?,
        animation_kind = ?,
        hero_summary = ?,
        sections_json = ?,
        misconceptions_json = ?,
        quiz_json = ?,
        quick_prompts_json = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .bind(
      normalized.lessonSlug,
      normalized.title,
      normalized.description,
      normalized.order,
      normalized.estimatedMinutes,
      serializeLearningJson(normalized.objectives),
      serializeLearningJson(normalized.keywords),
      normalized.chatContextSummary,
      serializeLearningJson(normalized.relatedLessonSlugs),
      normalized.animation,
      normalized.heroSummary,
      serializeLearningJson(normalized.sections),
      serializeLearningJson(normalized.misconceptions),
      serializeLearningJson(normalized.quiz),
      serializeLearningJson(normalized.quickPrompts),
      normalized.status,
      updatedAt,
      lessonId,
    )
    .run());

  const row = await withLearningSchema(db, () => db.prepare(`
      SELECT *
      FROM learning_lessons
      WHERE id = ?
      LIMIT 1
    `)
    .bind(lessonId)
    .first<LearningLessonRow>());

  if (!row) {
    return null;
  }

  const track = await getLearningTrackById(db, row.track_id);
  return attachSubjectSlugToLesson(track?.slug ?? 'networking', mapLearningLessonRow(row));
}

export async function deleteLearningTrack(db: D1Database, id: string) {
  await withLearningSchema(db, async () => {
    await db.prepare(`DELETE FROM learning_lessons WHERE track_id = ?`).bind(id).run();
    await db.prepare(`DELETE FROM learning_tracks WHERE id = ?`).bind(id).run();
  });
}

export async function deleteLearningLesson(db: D1Database, id: string) {
  await withLearningSchema(db, () => db.prepare(`
      DELETE FROM learning_lessons
      WHERE id = ?
    `)
    .bind(id)
    .run());
}
