import {
  ensureLearningChatSchema,
  getLearningChatLessonEntry,
  generateLearningChatReply,
  getLearningChatIpHash,
  getLearningChatRateLimit,
  recordLearningChatRequest,
  trimLearningChatMessages,
} from '../../../lib/learning/chat';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

export async function POST(context) {
  const db = context.locals.runtime?.env?.DB;
  const baseUrl = String(context.locals.runtime?.env?.LEARNING_AI_BASE_URL ?? '').trim();
  const apiKey = String(context.locals.runtime?.env?.LEARNING_AI_API_KEY ?? '').trim();
  const model = String(context.locals.runtime?.env?.LEARNING_AI_MODEL ?? '').trim();

  if (!db || !baseUrl || !apiKey || !model) {
    return json({ message: '当前未启用课内问答。' }, 503);
  }

  let payload: {
    subject?: string;
    lessonSlug?: string;
    messages?: unknown;
  };

  try {
    payload = await context.request.json();
  } catch {
    return json({ message: '请求格式错误。' }, 400);
  }

  const subject = String(payload.subject ?? '').trim();
  const lessonSlug = String(payload.lessonSlug ?? '').trim();
  const resolved = await getLearningChatLessonEntry({
    db,
    subject,
    lessonSlug,
  });

  if (!resolved) {
    return json({ message: '未找到对应的学习课时。' }, 404);
  }

  const messages = trimLearningChatMessages(payload.messages);
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');

  if (!latestUserMessage) {
    return json({ message: '请先输入问题。' }, 400);
  }

  try {
    await ensureLearningChatSchema(db);

    const ipHash = await getLearningChatIpHash(context.request);
    const rateLimit = await getLearningChatRateLimit(db, ipHash);

    if (!rateLimit.allowed) {
      return json({
        message: `当前提问过于频繁，请稍后再试。已用完每小时 ${rateLimit.hourlyCount}/8 或每日 ${rateLimit.dailyCount}/30 的额度。`,
      }, 429);
    }

    const reply = await generateLearningChatReply({
      db,
      baseUrl,
      apiKey,
      model,
      subject,
      lessonSlug,
      messages,
    });

    await recordLearningChatRequest(db, {
      ipHash,
      subject,
      lessonSlug,
    });

    return json({
      reply,
      message: `已基于《${resolved.lesson.title}》当前课时内容回答。`,
    });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : '课内问答失败，请稍后再试。' }, 502);
  }
}
