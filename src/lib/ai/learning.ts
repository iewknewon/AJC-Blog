import { slugifyTitle } from './openai-compatible';
import { extractJsonBlock, generateCompatibleText } from './openai-generic';
import type {
  LearningAnimationKind,
  LearningConceptOverview,
  LearningLessonSection,
  LearningMisconception,
  LearningQuizQuestion,
} from '../../data/learning/types';
import { learningStages } from '../../data/learning/stages';
import type { LearningPageVariant, LearningStageSlug } from '../learning/types';

export type LearningTrackBlueprint = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  stageSlug: LearningStageSlug;
  eyebrow: string;
  colorToken: string;
  icon: string;
  pageVariant: LearningPageVariant;
  learningPath: string[];
  conceptOverview: LearningConceptOverview;
  sourcePrompt: string;
};

export type LearningLessonOutlineItem = {
  lessonSlug: string;
  title: string;
  description: string;
  order: number;
  estimatedMinutes: number;
  objectives: string[];
  keywords: string[];
  animation: LearningAnimationKind;
  heroSummary: string;
  chatContextSummary: string;
  quickPrompts: string[];
};

export type LearningLessonOutline = {
  lessons: LearningLessonOutlineItem[];
};

export type LearningLessonDraft = {
  sections: LearningLessonSection[];
  misconceptions: LearningMisconception[];
  quiz: LearningQuizQuestion[];
  relatedLessonSlugs: string[];
};

const STAGE_SLUGS = learningStages.map((stage) => stage.slug);
const ANIMATION_KINDS: LearningAnimationKind[] = [
  'protocol-stack',
  'http-lifecycle',
  'tcp-flow',
  'system-architecture',
  'instruction-cycle',
  'cache-locality',
  'ai-agent-landscape',
  'skill-tool-function',
  'mcp-flow',
  'workflow-vs-agent',
  'memory-context',
  'rag-pipeline',
  'guardrails-observability',
  'reverse-landscape',
  'pe-anatomy',
  'register-flow',
  'debugger-flow',
  'memory-stack-frame',
  'reverse-case-trace',
];

function normalizeText(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeMultilineParagraphs(input: unknown) {
  if (!Array.isArray(input)) {
    return [] as string[];
  }

  return input
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);
}

function normalizeStringList(input: unknown, maxItems = 8) {
  if (!Array.isArray(input)) {
    return [] as string[];
  }

  const seen = new Set<string>();

  return input
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, maxItems);
}

function normalizeStageSlug(input: unknown): LearningStageSlug {
  const candidate = normalizeText(input);
  return STAGE_SLUGS.includes(candidate as LearningStageSlug)
    ? candidate as LearningStageSlug
    : 'special-topics';
}

function normalizeAnimationKind(input: unknown): LearningAnimationKind {
  const candidate = normalizeText(input);
  return ANIMATION_KINDS.includes(candidate as LearningAnimationKind)
    ? candidate as LearningAnimationKind
    : 'workflow-vs-agent';
}

function normalizePageVariant(input: unknown): LearningPageVariant {
  return normalizeText(input) === 'timeline' ? 'timeline' : 'default';
}

function normalizeColorToken(input: unknown) {
  const candidate = normalizeText(input).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return candidate || 'learning';
}

function buildIcon(title: string, input?: unknown) {
  const explicit = normalizeText(input).toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (explicit.length >= 2) {
    return explicit.slice(0, 4);
  }

  const initials = title
    .split(/[^A-Za-z0-9\u4e00-\u9fa5]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  return (initials || 'LR').slice(0, 4);
}

function buildFallbackLearningPath(title: string) {
  return [
    `先知道 ${title} 在解决什么问题`,
    `再把 ${title} 的核心概念串起来`,
    `最后把 ${title} 放进真实场景里使用`,
  ];
}

function buildFallbackConceptOverview(title: string, description: string, learningPath: string[]): LearningConceptOverview {
  return {
    title: `${title} 是什么`,
    summary: description || `这是一条围绕 ${title} 展开的学习路线，会先搭框架，再补细节，最后进入应用场景。`,
    pillars: learningPath.slice(0, 3).map((item) => item.replace(/^先|再|最后/, '').trim() || item),
    safetyNotes: [
      '内容以帮助理解原理和建立学习路径为主。',
      '若涉及工具或实践，默认强调合法、合规和防御性使用。',
    ],
  };
}

function normalizeConceptOverview(
  input: unknown,
  title: string,
  description: string,
  learningPath: string[],
) {
  if (!input || typeof input !== 'object') {
    return buildFallbackConceptOverview(title, description, learningPath);
  }

  const record = input as Record<string, unknown>;
  const normalized = {
    title: normalizeText(record.title) || `${title} 是什么`,
    summary: normalizeText(record.summary) || description,
    pillars: normalizeStringList(record.pillars, 4),
    safetyNotes: normalizeStringList(record.safetyNotes, 4),
  } satisfies LearningConceptOverview;

  if (!normalized.summary || normalized.pillars.length === 0 || normalized.safetyNotes.length === 0) {
    return buildFallbackConceptOverview(title, description, learningPath);
  }

  return normalized;
}

function normalizeSections(input: unknown) {
  if (!Array.isArray(input)) {
    return [] as LearningLessonSection[];
  }

  return input
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const title = normalizeText(record.title);
      const paragraphs = normalizeMultilineParagraphs(record.paragraphs);

      if (!title || paragraphs.length === 0) {
        return null;
      }

      return { title, paragraphs };
    })
    .filter((item): item is LearningLessonSection => Boolean(item));
}

function normalizeMisconceptions(input: unknown) {
  if (!Array.isArray(input)) {
    return [] as LearningMisconception[];
  }

  return input
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const myth = normalizeText(record.myth);
      const clarification = normalizeText(record.clarification);

      if (!myth || !clarification) {
        return null;
      }

      return { myth, clarification };
    })
    .filter((item): item is LearningMisconception => Boolean(item))
    .slice(0, 4);
}

function normalizeQuiz(input: unknown) {
  if (!Array.isArray(input)) {
    return [] as LearningQuizQuestion[];
  }

  return input
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const question = normalizeText(record.question);
      const options = normalizeStringList(record.options, 6);
      const explanation = normalizeText(record.explanation);
      const answerIndex = Number(record.answerIndex);

      if (!question || options.length < 2 || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length || !explanation) {
        return null;
      }

      return {
        question,
        options,
        answerIndex,
        explanation,
      };
    })
    .filter((item): item is LearningQuizQuestion => Boolean(item))
    .slice(0, 6);
}

function buildFallbackLessonOutline(prompt: string, title: string): LearningLessonOutline {
  const seed = title || prompt || '学习专题';
  const lessonTitles = [
    `${seed} 全景与问题背景`,
    `${seed} 核心概念`,
    `${seed} 关键流程`,
    `${seed} 典型场景`,
  ];

  return {
    lessons: lessonTitles.map((lessonTitle, index) => ({
      lessonSlug: slugifyTitle(lessonTitle),
      title: lessonTitle,
      description: `这节课聚焦 ${lessonTitle}，帮助学习者建立更稳的理解框架。`,
      order: index + 1,
      estimatedMinutes: 12,
      objectives: [
        `知道 ${lessonTitle} 在整条学习线里的位置`,
        `能用自己的话解释 ${lessonTitle} 的核心点`,
        `知道学习完这节课后下一步该看什么`,
      ],
      keywords: normalizeStringList([seed, lessonTitle, '原理', '流程', '案例'], 5),
      animation: 'workflow-vs-agent',
      heroSummary: `先用直观方式讲明白 ${lessonTitle}，再进入结构化理解。`,
      chatContextSummary: `回答时请始终围绕“${lessonTitle}”展开，并结合本课的关键概念、流程和常见误区。`,
      quickPrompts: ['再通俗一点', '举个现实例子', '和上一课有什么关系', '出两道检测题'],
    })),
  };
}

function buildFallbackLessonDraft(title: string, description: string): LearningLessonDraft {
  return {
    sections: [
      {
        title: '先建立直觉',
        paragraphs: [
          `${title} 可以先理解成一个帮助我们组织知识和判断过程的模型。`,
          description || `学这节课的重点，不是死记术语，而是先把核心关系看清楚。`,
        ],
      },
      {
        title: '再拆关键环节',
        paragraphs: [
          '把复杂过程拆成几个明确步骤后，很多抽象概念都会变得可跟踪、可验证。',
          '真正需要掌握的是每一步为什么发生、前后之间又是怎么连接起来的。',
        ],
      },
      {
        title: '最后放进场景',
        paragraphs: [
          '把这套知识放回真实应用场景，才能判断它在实践里真正影响什么。',
          '如果一个概念只能背定义而不能解释场景，它通常还没有真正学会。',
        ],
      },
    ],
    misconceptions: [
      {
        myth: `${title} 只是一些术语和定义，不需要理解过程。`,
        clarification: '术语只是入口，真正重要的是结构、流程和它们在真实问题里的作用。',
      },
      {
        myth: `只要记住 ${title} 的结论就够了。`,
        clarification: '如果不知道结论是怎么来的，一遇到变体场景就很难举一反三。',
      },
    ],
    quiz: [
      {
        question: `这节课最应该优先掌握 ${title} 的哪一部分？`,
        options: ['只记名词', '只背定义', '理解关键流程与关系', '跳过基础直接看高级话题'],
        answerIndex: 2,
        explanation: '掌握结构和流程后，定义、场景和延伸问题会更容易被真正理解。',
      },
      {
        question: '判断是否学会一个知识点，最可靠的标准是什么？',
        options: ['能背下来', '能解释过程并套进场景', '看过一遍', '术语写得很全'],
        answerIndex: 1,
        explanation: '能解释、能迁移、能回答变体问题，才说明理解已经比较稳了。',
      },
    ],
    relatedLessonSlugs: [],
  };
}

function parseJsonObject<T>(rawText: string) {
  return JSON.parse(extractJsonBlock(rawText)) as T;
}

export function parseLearningTrackBlueprint(rawText: string, sourcePrompt = ''): LearningTrackBlueprint {
  const parsed = parseJsonObject<Partial<LearningTrackBlueprint>>(rawText);
  const title = normalizeText(parsed.title) || 'AI 学习专题';
  const description = normalizeText(parsed.description) || `围绕 ${title} 构建一条可持续扩展的学习路线。`;
  const learningPath = normalizeStringList(parsed.learningPath, 6);
  const safeLearningPath = learningPath.length > 0 ? learningPath : buildFallbackLearningPath(title);

  return {
    slug: slugifyTitle(normalizeText(parsed.slug) || title),
    title,
    shortTitle: normalizeText(parsed.shortTitle) || title,
    description,
    stageSlug: normalizeStageSlug(parsed.stageSlug),
    eyebrow: normalizeText(parsed.eyebrow) || 'Learning Track',
    colorToken: normalizeColorToken(parsed.colorToken),
    icon: buildIcon(title, parsed.icon),
    pageVariant: normalizePageVariant(parsed.pageVariant),
    learningPath: safeLearningPath,
    conceptOverview: normalizeConceptOverview(parsed.conceptOverview, title, description, safeLearningPath),
    sourcePrompt: normalizeText(sourcePrompt),
  };
}

export function parseLearningLessonOutline(rawText: string, input: { prompt?: string; blueprint?: LearningTrackBlueprint } = {}): LearningLessonOutline {
  const parsed = parseJsonObject<{ lessons?: unknown } | unknown[]>(rawText);
  const rawLessons = Array.isArray(parsed) ? parsed : Array.isArray(parsed.lessons) ? parsed.lessons : [];
  const fallbackTitle = input.blueprint?.title || input.prompt || '学习专题';
  const seenSlugs = new Set<string>();

  const lessons = rawLessons
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const title = normalizeText(record.title) || `${fallbackTitle} 第 ${index + 1} 课`;
      let lessonSlug = slugifyTitle(normalizeText(record.lessonSlug) || title);

      while (seenSlugs.has(lessonSlug)) {
        lessonSlug = `${lessonSlug}-${index + 2}`;
      }

      seenSlugs.add(lessonSlug);

      return {
        lessonSlug,
        title,
        description: normalizeText(record.description) || `这节课将围绕 ${title} 建立直观理解与结构化认知。`,
        order: Math.max(1, Number(record.order) || index + 1),
        estimatedMinutes: Math.max(5, Number(record.estimatedMinutes) || 12),
        objectives: normalizeStringList(record.objectives, 6),
        keywords: normalizeStringList(record.keywords, 8),
        animation: normalizeAnimationKind(record.animation),
        heroSummary: normalizeText(record.heroSummary) || `用直观方式讲清楚 ${title}，再进入关键原理。`,
        chatContextSummary: normalizeText(record.chatContextSummary) || `回答时请围绕“${title}”的核心概念、关键流程与常见误区展开。`,
        quickPrompts: normalizeStringList(record.quickPrompts, 6),
      };
    })
    .filter((item): item is LearningLessonOutlineItem => Boolean(item))
    .map((item, index) => ({
      ...item,
      order: index + 1,
      objectives: item.objectives.length > 0
        ? item.objectives
        : [
          `知道 ${item.title} 在整条学习线里的位置`,
          `能解释 ${item.title} 的关键概念`,
          `能把 ${item.title} 放进一个真实场景中理解`,
        ],
      keywords: item.keywords.length > 0
        ? item.keywords
        : normalizeStringList([item.title, fallbackTitle, '原理', '流程', '案例'], 5),
      quickPrompts: item.quickPrompts.length > 0
        ? item.quickPrompts
        : ['再通俗一点', '举个现实例子', '和上一课有什么关系', '出两道检测题'],
    }));

  return lessons.length > 0 ? { lessons } : buildFallbackLessonOutline(input.prompt || '', fallbackTitle);
}

export function parseLearningLessonDraft(rawText: string, input: { title?: string; description?: string } = {}): LearningLessonDraft {
  const parsed = parseJsonObject<Partial<LearningLessonDraft>>(rawText);
  const title = normalizeText(input.title) || '本课';
  const description = normalizeText(input.description);
  const sections = normalizeSections(parsed.sections);
  const quiz = normalizeQuiz(parsed.quiz);

  if (sections.length === 0 || quiz.length === 0) {
    return buildFallbackLessonDraft(title, description);
  }

  return {
    sections,
    misconceptions: normalizeMisconceptions(parsed.misconceptions),
    quiz,
    relatedLessonSlugs: normalizeStringList(parsed.relatedLessonSlugs, 6).map((item) => slugifyTitle(item)),
  };
}

function buildTrackBlueprintPrompt(prompt: string) {
  return [
    '你要为一个公开技术学习中心设计一条新的学习专题。',
    '请只返回 JSON，不要返回 Markdown，不要补充解释。',
    `stageSlug 只能从这些值里选一个: ${STAGE_SLUGS.join(', ')}`,
    'pageVariant 只能是 default 或 timeline。',
    'learningPath 输出 3 到 5 条。',
    'conceptOverview 必须包含 title、summary、pillars、safetyNotes。',
    'icon 请给出 2 到 4 个英文大写字母。',
    '所有面向学习者的文案请使用简体中文。',
    'JSON 结构如下：',
    '{"slug":"","title":"","shortTitle":"","description":"","stageSlug":"","eyebrow":"Learning Track","colorToken":"","icon":"","pageVariant":"default","learningPath":[""],"conceptOverview":{"title":"","summary":"","pillars":[""],"safetyNotes":[""]}}',
    '',
    '用户需求：',
    prompt.trim(),
  ].join('\n');
}

function buildLessonOutlinePrompt(prompt: string, blueprint: LearningTrackBlueprint) {
  return [
    '你要为一个公开学习专题设计课程大纲。',
    '请只返回 JSON，不要返回 Markdown，不要补充解释。',
    '输出 lessons 数组，建议 4 到 6 节课。',
    `animation 只能从这些值里选一个: ${ANIMATION_KINDS.join(', ')}`,
    '每节课都必须包含 lessonSlug、title、description、order、estimatedMinutes、objectives、keywords、animation、heroSummary、chatContextSummary、quickPrompts。',
    'lessonSlug 使用英文 kebab-case。',
    '所有学习者可见文案请使用简体中文。',
    'JSON 结构如下：',
    '{"lessons":[{"lessonSlug":"","title":"","description":"","order":1,"estimatedMinutes":12,"objectives":[""],"keywords":[""],"animation":"workflow-vs-agent","heroSummary":"","chatContextSummary":"","quickPrompts":[""]}]}',
    '',
    '专题信息：',
    JSON.stringify(blueprint),
    '',
    '原始需求：',
    prompt.trim(),
  ].join('\n');
}

export function buildContinuationOutlinePrompt(input: {
  direction: string;
  count: number;
  blueprint: LearningTrackBlueprint;
  existingLessons: Array<Pick<LearningLessonOutlineItem, 'order' | 'lessonSlug' | 'title' | 'description'>>;
}) {
  return [
    '你要继续扩写一条已经存在的公开学习专题。',
    '只能追加新的课时，不要重写、替换或重命名已有课时。',
    'Append new lessons only. Do not rewrite existing lessons.',
    `本次只输出 ${input.count} 节新课。`,
    `animation 只能从这些值里选一个：${ANIMATION_KINDS.join(', ')}`,
    '所有学习者可见文案请使用简体中文，lessonSlug 保持英文 kebab-case。',
    '请只返回 JSON，结构为 {"lessons":[...]}。',
    '',
    '专题信息：',
    JSON.stringify(input.blueprint),
    '',
    '已有课时：',
    JSON.stringify(input.existingLessons),
    '',
    '续写方向：',
    input.direction.trim(),
  ].join('\n');
}

function buildLessonDraftPrompt(prompt: string, blueprint: LearningTrackBlueprint, lesson: LearningLessonOutlineItem) {
  return [
    '你要为一节技术学习课生成完整正文结构。',
    '请只返回 JSON，不要返回 Markdown，不要补充解释。',
    '必须输出 sections、misconceptions、quiz、relatedLessonSlugs。',
    'sections 至少 3 个，每个 section 需要 title 和 paragraphs。',
    'quiz 至少 2 道题，每题需要 question、options、answerIndex、explanation。',
    'misconceptions 建议 2 条。',
    'relatedLessonSlugs 只放同专题内的 lessonSlug，可以为空数组。',
    '所有学习者可见文案请使用简体中文。',
    'JSON 结构如下：',
    '{"sections":[{"title":"","paragraphs":["",""]}],"misconceptions":[{"myth":"","clarification":""}],"quiz":[{"question":"","options":["",""],"answerIndex":0,"explanation":""}],"relatedLessonSlugs":[""]}',
    '',
    '专题信息：',
    JSON.stringify(blueprint),
    '',
    '当前课信息：',
    JSON.stringify(lesson),
    '',
    '原始需求：',
    prompt.trim(),
  ].join('\n');
}

export async function generateLearningTrackBlueprint(
  baseUrl: string,
  apiKey: string,
  model: string,
  input: { prompt: string },
) {
  const rawText = await generateCompatibleText(baseUrl, apiKey, model, {
    temperature: 0.35,
    systemPrompt: '你是一个面向公开学习网站的课程策划助手，擅长把模糊需求整理成结构化学习专题。',
    userPrompt: buildTrackBlueprintPrompt(input.prompt),
  });

  return parseLearningTrackBlueprint(rawText, input.prompt);
}

export async function generateLearningLessonOutline(
  baseUrl: string,
  apiKey: string,
  model: string,
  input: { prompt: string; blueprint: LearningTrackBlueprint },
) {
  const rawText = await generateCompatibleText(baseUrl, apiKey, model, {
    temperature: 0.45,
    systemPrompt: '你是一个面向公开学习网站的课程架构助手，擅长把一个专题拆成层次清晰、顺序合理的系列课时。',
    userPrompt: buildLessonOutlinePrompt(input.prompt, input.blueprint),
  });

  return parseLearningLessonOutline(rawText, input);
}

export async function generateLearningContinuationOutline(
  baseUrl: string,
  apiKey: string,
  model: string,
  input: Parameters<typeof buildContinuationOutlinePrompt>[0],
) {
  const rawText = await generateCompatibleText(baseUrl, apiKey, model, {
    temperature: 0.45,
    systemPrompt: '你是一个学习专题续写助手，擅长在保留既有节奏的前提下继续追加合理的新课时。',
    userPrompt: buildContinuationOutlinePrompt(input),
  });

  return parseLearningLessonOutline(rawText, {
    prompt: input.direction,
    blueprint: input.blueprint,
  });
}

export async function generateLearningLessonDraft(
  baseUrl: string,
  apiKey: string,
  model: string,
  input: { prompt: string; blueprint: LearningTrackBlueprint; outline: LearningLessonOutlineItem },
) {
  const rawText = await generateCompatibleText(baseUrl, apiKey, model, {
    temperature: 0.5,
    systemPrompt: '你是一个技术课程写作助手，擅长把抽象概念写得直观、可学、可追问，并能生成误区提醒和检测题。',
    userPrompt: buildLessonDraftPrompt(input.prompt, input.blueprint, input.outline),
  });

  return parseLearningLessonDraft(rawText, input.outline);
}
