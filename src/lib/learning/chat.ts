import { generateCompatibleText } from '../ai/openai-generic';
import { getLearningLesson, getMergedLearningLesson } from './content';

export type LearningChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type LearningChatRateLimit = {
  hourlyCount: number;
  dailyCount: number;
  allowed: boolean;
};

const learningChatSchemaReady = new WeakSet<D1Database>();
const learningChatSchemaPending = new WeakMap<D1Database, Promise<void>>();

const LEARNING_CHAT_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS learning_chat_requests (
    id TEXT PRIMARY KEY,
    ip_hash TEXT,
    subject TEXT NOT NULL,
    lesson_slug TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_learning_chat_requests_ip_hash_created_at ON learning_chat_requests(ip_hash, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_learning_chat_requests_lesson_created_at ON learning_chat_requests(lesson_slug, created_at DESC)`,
] as const;

function readOptionalText(value: unknown, maxLength = 1600) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error ?? '');
}

function isMissingLearningChatTableError(error: unknown) {
  return /no such table:\s*learning_chat_requests/i.test(getErrorMessage(error));
}

export async function ensureLearningChatSchema(db: D1Database) {
  if (learningChatSchemaReady.has(db)) {
    return;
  }

  const existingTask = learningChatSchemaPending.get(db);

  if (existingTask) {
    await existingTask;
    return;
  }

  const task = (async () => {
    await db.batch(LEARNING_CHAT_SCHEMA_STATEMENTS.map((sql) => db.prepare(sql)));
    learningChatSchemaReady.add(db);
  })().finally(() => {
    learningChatSchemaPending.delete(db);
  });

  learningChatSchemaPending.set(db, task);
  await task;
}

async function withLearningChatSchema<T>(db: D1Database, action: () => Promise<T>) {
  await ensureLearningChatSchema(db);

  try {
    return await action();
  } catch (error) {
    if (!isMissingLearningChatTableError(error)) {
      throw error;
    }

    learningChatSchemaReady.delete(db);
    await ensureLearningChatSchema(db);
    return action();
  }
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

async function hashText(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function getLearningChatIpHash(request: Request) {
  const ipAddress = readClientIpAddress(request);
  return ipAddress ? hashText(ipAddress) : null;
}

export function trimLearningChatMessages(messages: unknown, maxMessages = 12) {
  if (!Array.isArray(messages)) {
    return [] as LearningChatMessage[];
  }

  return messages
    .map((message): LearningChatMessage | null => {
      if (!message || typeof message !== 'object') {
        return null;
      }

      const role = (message as { role?: unknown }).role;
      const content = readOptionalText((message as { content?: unknown }).content, 1000);

      if ((role !== 'user' && role !== 'assistant') || !content) {
        return null;
      }

      return {
        role,
        content,
      };
    })
    .filter((message): message is LearningChatMessage => Boolean(message))
    .slice(-maxMessages);
}

export async function getLearningChatRateLimit(db: D1Database, ipHash: string | null): Promise<LearningChatRateLimit> {
  if (!ipHash) {
    return {
      hourlyCount: 0,
      dailyCount: 0,
      allowed: true,
    };
  }

  const now = Date.now();
  const hourThreshold = new Date(now - 60 * 60 * 1000).toISOString();
  const dayThreshold = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const row = await withLearningChatSchema(db, () => db.prepare(`
      SELECT
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS hourly_count,
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS daily_count
      FROM learning_chat_requests
      WHERE ip_hash = ?
    `)
    .bind(hourThreshold, dayThreshold, ipHash)
    .first<{
      hourly_count?: unknown;
      daily_count?: unknown;
    }>());

  const hourlyCount = Number(row?.hourly_count ?? 0) || 0;
  const dailyCount = Number(row?.daily_count ?? 0) || 0;

  return {
    hourlyCount,
    dailyCount,
    allowed: hourlyCount < 8 && dailyCount < 30,
  };
}

export async function recordLearningChatRequest(
  db: D1Database,
  input: { ipHash: string | null; subject: string; lessonSlug: string },
) {
  await withLearningChatSchema(db, () => db.prepare(`
      INSERT INTO learning_chat_requests (
        id,
        ip_hash,
        subject,
        lesson_slug,
        created_at
      )
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(
      crypto.randomUUID(),
      input.ipHash,
      input.subject,
      input.lessonSlug,
      new Date().toISOString(),
    )
    .run());
}

function formatTranscript(messages: LearningChatMessage[]) {
  return messages.map((message) => {
    const roleLabel = message.role === 'user' ? 'User' : 'Assistant';
    return `${roleLabel}: ${message.content}`;
  }).join('\n');
}

export function buildLearningChatPrompt(input: {
  subject: string;
  lessonSlug: string;
  messages: LearningChatMessage[];
}) {
  const resolved = getLearningLesson(input.subject, input.lessonSlug);

  if (!resolved) {
    throw new Error('Unknown learning lesson.');
  }

  const { subject, lesson } = resolved;

  return [
    `Track: ${subject.title}`,
    `Lesson: ${lesson.title}`,
    `Objectives: ${lesson.objectives.join(' | ')}`,
    `Keywords: ${lesson.keywords.join(' / ')}`,
    `Lesson summary: ${lesson.chatContextSummary}`,
    `Common misconceptions: ${lesson.misconceptions.map((item) => `${item.myth} -> ${item.clarification}`).join(' | ')}`,
    'Rules:',
    '- Answer only within the scope of the current lesson and nearby follow-up ideas.',
    '- Be clear, concrete, and beginner-friendly.',
    '- If the learner asks something adjacent, connect it back to this lesson before expanding.',
    '- Do not invent details that are outside the current lesson context.',
    'Conversation:',
    formatTranscript(input.messages) || 'No prior conversation.',
  ].join('\n');
}

export async function getLearningChatLessonEntry(input: {
  db?: D1Database;
  subject: string;
  lessonSlug: string;
}) {
  return getMergedLearningLesson(input.subject, input.lessonSlug, input.db);
}

export async function buildManagedLearningChatPrompt(input: {
  db?: D1Database;
  subject: string;
  lessonSlug: string;
  messages: LearningChatMessage[];
}) {
  const resolved = await getLearningChatLessonEntry(input);

  if (!resolved) {
    throw new Error('Unknown learning lesson.');
  }

  const { subject, lesson } = resolved;

  return [
    `Track: ${subject.title}`,
    `Lesson: ${lesson.title}`,
    `Objectives: ${lesson.objectives.join(' | ')}`,
    `Keywords: ${lesson.keywords.join(' / ')}`,
    `Lesson summary: ${lesson.chatContextSummary}`,
    `Common misconceptions: ${lesson.misconceptions.map((item) => `${item.myth} -> ${item.clarification}`).join(' | ')}`,
    'Rules:',
    '- Answer only within the scope of the current lesson and nearby follow-up ideas.',
    '- Be clear, concrete, and beginner-friendly.',
    '- If the learner asks something adjacent, connect it back to this lesson before expanding.',
    '- Do not invent details that are outside the current lesson context.',
    'Conversation:',
    formatTranscript(input.messages) || 'No prior conversation.',
  ].join('\n');
}

export async function generateLearningChatReply(input: {
  db?: D1Database;
  baseUrl: string;
  apiKey: string;
  model: string;
  subject: string;
  lessonSlug: string;
  messages: LearningChatMessage[];
}) {
  const prompt = await buildManagedLearningChatPrompt({
    db: input.db,
    subject: input.subject,
    lessonSlug: input.lessonSlug,
    messages: input.messages,
  });

  const reply = await generateCompatibleText(input.baseUrl, input.apiKey, input.model, {
    systemPrompt: [
      'You are a lesson-bound learning assistant for the public learning center.',
      'Keep answers grounded in the current lesson, explain concepts clearly, and stay honest about uncertainty.',
      'If the learner asks something nearby but broader, bridge from the current lesson before expanding.',
    ].join('\n'),
    userPrompt: prompt,
    temperature: 0.4,
  });

  return readOptionalText(reply, 4000);
}
