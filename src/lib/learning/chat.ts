import { generateCompatibleText } from '../ai/openai-generic';
import { getLearningLesson } from './content';

export type LearningChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type LearningChatRateLimit = {
  hourlyCount: number;
  dailyCount: number;
  allowed: boolean;
};

type CloudflareRequest = Request & {
  cf?: Partial<IncomingRequestCfProperties>;
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

export function buildLearningChatPrompt(input: {
  subject: string;
  lessonSlug: string;
  messages: LearningChatMessage[];
}) {
  const resolved = getLearningLesson(input.subject, input.lessonSlug);

  if (!resolved) {
    throw new Error('未找到对应的学习课时。');
  }

  const { subject, lesson } = resolved;
  const transcript = input.messages.map((message) => {
    const roleLabel = message.role === 'user' ? '学员' : '助教';
    return `${roleLabel}：${message.content}`;
  }).join('\n');

  return [
    `当前课程：${subject.title}`,
    `当前课时：${lesson.title}`,
    `课时目标：${lesson.objectives.join('；')}`,
    `重点关键词：${lesson.keywords.join(' / ')}`,
    `课时摘要：${lesson.chatContextSummary}`,
    `常见误区：${lesson.misconceptions.map((item) => `${item.myth} -> ${item.clarification}`).join('；')}`,
    '要求：',
    '- 只回答与当前课时内容直接相关的问题与自然延伸。',
    '- 如果用户问题明显脱离当前课时，就温和提醒回到本课主题，不要扩展成泛化聊天。',
    '- 用中文回答，优先通俗、形象、循序渐进。',
    '- 如果用户要求更简单，使用类比；如果用户要求更深入，再增加细节。',
    '- 不要假装已经展示了不存在的图表或动画，但可以引用当前课的知识点。',
    '当前会话记录：',
    transcript || '学员刚进入本课，暂时还没有历史对话。',
  ].join('\n');
}

export async function generateLearningChatReply(input: {
  baseUrl: string;
  apiKey: string;
  model: string;
  subject: string;
  lessonSlug: string;
  messages: LearningChatMessage[];
}) {
  const resolved = getLearningLesson(input.subject, input.lessonSlug);

  if (!resolved) {
    throw new Error('未找到对应的学习课时。');
  }

  const prompt = buildLearningChatPrompt({
    subject: input.subject,
    lessonSlug: input.lessonSlug,
    messages: input.messages,
  });

  const reply = await generateCompatibleText(input.baseUrl, input.apiKey, input.model, {
    systemPrompt: [
      '你是一名计算机基础课程助教。',
      '你只围绕当前课时内容回答问题，帮助用户用更通俗、更形象的方式理解知识。',
      '回答要简洁清晰，必要时分点说明，但不要写成长篇论文。',
    ].join('\n'),
    userPrompt: prompt,
    temperature: 0.4,
  });

  return readOptionalText(reply, 4000);
}
