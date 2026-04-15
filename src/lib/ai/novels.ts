import { slugifyTitle } from './openai-compatible';
import { extractJsonBlock, generateCompatibleText } from './openai-generic';
import type { NovelChapter, NovelProject, NovelReferenceSource } from '../novels/types';

export type NovelLengthPreset = 'tight' | 'standard' | 'expanded';

export type NovelReferencePack = {
  referenceSummary: string;
  referenceNotes: string;
};

export type NovelMemoryUpdate = {
  summary: string;
  continuityDelta: string;
};

export type NovelStoryBible = {
  writingGoals: string;
  worldBible: string;
  characterBible: string;
  styleGuide: string;
};

export type NovelNextChapterPlan = {
  chapterRole: string;
  chapterTitleHint: string;
  titleDirection: string;
  chapterBrief: string;
  progressionChecklist: string;
  endingStrategy: string;
  endingNote: string;
};

export type NovelProjectBlueprint = {
  title: string;
  slug: string;
  premise: string;
  genre: string;
  writingGoals: string;
  referenceTitle: string;
  styleGuide: string;
};

type NovelGenerationContext = {
  project: NovelProject;
  chapters: NovelChapter[];
  sources: NovelReferenceSource[];
  volumeNumber: number;
  chapterNumber: number;
  chapterBrief: string;
  chapterTitleHint?: string;
  chapterRole?: string;
  titleDirection?: string;
  endingStrategy?: string;
  endingNote?: string;
  lengthPreset?: NovelLengthPreset;
};

function trimPromptText(input: string, limit: number) {
  const normalized = input.replace(/\s+/g, ' ').trim();

  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, limit - 1)).trimEnd()}...`;
}

function getLengthInstruction(lengthPreset: NovelLengthPreset = 'standard') {
  switch (lengthPreset) {
    case 'tight':
      return '单章控制在约 1200 到 1800 字，节奏要快，结尾必须留钩子。';
    case 'expanded':
      return '单章控制在约 2600 到 3600 字，可以更完整地展开冲突、转折和情绪递进。';
    case 'standard':
    default:
      return '单章控制在约 1800 到 2600 字，兼顾推进速度、人物状态变化和章节悬念。';
  }
}

function stripFencedMarkdown(text: string) {
  const fencedMatch = text.match(/```markdown\s*([\s\S]*?)\s*```/i) ?? text.match(/```\s*([\s\S]*?)\s*```/i);
  return fencedMatch?.[1]?.trim() || text.trim();
}

function buildSourceDigest(sources: NovelReferenceSource[]) {
  if (!sources.length) {
    return '暂无外部参考来源。';
  }

  return sources
    .slice(0, 5)
    .map((source, index) => [
      `资料 ${index + 1}`,
      `- 标题：${trimPromptText(source.title, 120)}`,
      `- 链接：${source.url}`,
      source.snippet ? `- 摘要：${trimPromptText(source.snippet, 220)}` : '',
      source.excerpt ? `- 摘录：${trimPromptText(source.excerpt, 500)}` : '',
    ].filter(Boolean).join('\n'))
    .join('\n');
}

function buildRecentChapterDigest(chapters: NovelChapter[]) {
  if (!chapters.length) {
    return '这是第一章，暂无前文。';
  }

  return [...chapters]
    .sort((left, right) => left.volumeNumber - right.volumeNumber || left.chapterNumber - right.chapterNumber)
    .slice(-6)
    .map((chapter) => (
      `- 第 ${chapter.volumeNumber} 卷 第 ${chapter.chapterNumber} 章《${chapter.title}》：${trimPromptText(
        chapter.summary || chapter.description || chapter.brief,
        180,
      )}`
    ))
    .join('\n');
}

export function buildNovelProjectBlueprintPrompt(input: {
  title?: string;
  concept: string;
  referenceTitle?: string;
}) {
  const title = String(input.title ?? '').trim();
  const referenceTitle = String(input.referenceTitle ?? '').trim();

  return [
    '请把下面这个小说创意整理成一个可直接启动的长篇连载项目。',
    '你必须只返回 JSON，不要输出解释。',
    '格式如下：',
    '{"title":"","slug":"","premise":"","genre":"","writingGoals":"","referenceTitle":"","styleGuide":""}',
    '要求：',
    '- 如果用户已经给了标题，就保留该标题；如果没有，再补一个适合中文连载的标题。',
    '- slug 必须是简短的英文或拼音风格 kebab-case，只能包含小写字母、数字和短横线。',
    '- premise 要写成 1 到 3 句的核心设定，明确主角、主冲突、改写方向和故事卖点。',
    '- genre 写最适合的主类型，例如 玄幻、科幻、悬疑、都市。',
    '- writingGoals 用中文项目符号整理成 4 到 6 条，强调节奏、章节钩子、长期连载策略和读者预期。',
    '- 如果给了参考作品，就保留或细化 referenceTitle；如果没有且创意里明显指向某部作品，可以推断，但不要乱猜。',
    '- styleGuide 用中文写 4 到 6 条文风要求，重点是叙事节奏、语气、章节断点、人物对话和避免跑偏的约束。',
    '- 如果创意是“把原书的某个核心概念替换成新设定”，必须把这个替换逻辑写进 premise、writingGoals 和 styleGuide。',
    '',
    `用户提供的标题：${title || '未提供'}`,
    `用户提供的创意描述：${input.concept}`,
    `用户提供的参考作品：${referenceTitle || '未提供'}`,
  ].join('\n');
}

export function buildNovelResearchQuery(project: Pick<NovelProject, 'title' | 'referenceTitle' | 'genre' | 'premise'>) {
  const referenceTitle = String(project.referenceTitle ?? '').trim();
  const seed = referenceTitle || project.title.trim();
  const genre = project.genre.trim();

  return [seed, genre, '小说 人物 世界观 剧情 梗概'].filter(Boolean).join(' ');
}

export async function generateNovelProjectBlueprint(
  baseUrl: string,
  apiKey: string,
  model: string,
  input: {
    title?: string;
    concept: string;
    referenceTitle?: string;
  },
) {
  const rawText = await generateCompatibleText(baseUrl, apiKey, model, {
    temperature: 0.45,
    systemPrompt: [
      '你是中文长篇小说策划编辑。',
      '你的任务是根据一个创意描述和参考作品，生成一个可以立刻进入连载工作台的项目蓝图。',
      '你必须只返回 JSON，不要输出解释。',
    ].join('\n'),
    userPrompt: buildNovelProjectBlueprintPrompt(input),
  });

  const parsed = JSON.parse(extractJsonBlock(rawText)) as Partial<NovelProjectBlueprint>;
  const title = String(parsed.title ?? input.title ?? '').trim() || '未命名小说项目';
  const referenceTitle = String(parsed.referenceTitle ?? input.referenceTitle ?? '').trim();

  return {
    title,
    slug: slugifyTitle(String(parsed.slug ?? title).trim()),
    premise: String(parsed.premise ?? '').trim() || input.concept.trim(),
    genre: String(parsed.genre ?? '').trim(),
    writingGoals: String(parsed.writingGoals ?? '').trim(),
    referenceTitle,
    styleGuide: String(parsed.styleGuide ?? '').trim(),
  } satisfies NovelProjectBlueprint;
}

function buildReferencePackFallback(
  project: Pick<NovelProject, 'referenceTitle' | 'title'>,
  sources: NovelReferenceSource[],
): NovelReferencePack {
  if (!sources.length) {
    return {
      referenceSummary: project.referenceTitle
        ? `参考作品《${project.referenceTitle}》尚未检索到公开摘要，请你自行补充关键设定。`
        : '',
      referenceNotes: '',
    };
  }

  return {
    referenceSummary: sources
      .slice(0, 3)
      .map((source) => `${source.title}：${source.snippet || source.excerpt || ''}`.trim())
      .filter(Boolean)
      .join('\n'),
    referenceNotes: sources
      .slice(0, 4)
      .map((source) => `- ${source.title}\n  ${trimPromptText(source.excerpt || source.snippet, 220)}`)
      .join('\n'),
  };
}

export async function generateNovelReferencePack(
  baseUrl: string,
  apiKey: string,
  model: string,
  project: Pick<NovelProject, 'title' | 'referenceTitle' | 'premise'>,
  sources: NovelReferenceSource[],
) {
  if (!sources.length) {
    return buildReferencePackFallback(project, sources);
  }

  const fallback = buildReferencePackFallback(project, sources);
  const rawText = await generateCompatibleText(baseUrl, apiKey, model, {
    temperature: 0.3,
    systemPrompt: [
      '你是长篇小说策划编辑，负责把公开检索资料整理成续写用的参考包。',
      '不要复制原著原文，不要伪造资料来源。',
      '你必须只返回 JSON，不要输出解释。',
    ].join('\n'),
    userPrompt: [
      '请根据下面这些公开资料，整理一个适合续写和同人衍生创作的参考包。',
      `当前项目标题：${project.title}`,
      `参考作品：${project.referenceTitle || '无'}`,
      `当前项目核心设定：${project.premise}`,
      '请返回 JSON，格式如下：',
      '{"referenceSummary":"","referenceNotes":""}',
      '要求：',
      '- referenceSummary：用一段中文概述参考作品当前最关键的世界观、主线、人物关系。',
      '- referenceNotes：用项目笔记风格输出，可用短段落或项目符号，重点写“人物现状 / 世界规则 / 已知主线 / 续写时要保持的约束”。',
      '- 只能依据下方公开资料，不要补充没有来源支撑的细节。',
      '公开资料：',
      buildSourceDigest(sources),
    ].join('\n'),
  });

  const parsed = JSON.parse(extractJsonBlock(rawText)) as Partial<NovelReferencePack>;

  return {
    referenceSummary: String(parsed.referenceSummary ?? '').trim() || fallback.referenceSummary,
    referenceNotes: String(parsed.referenceNotes ?? '').trim() || fallback.referenceNotes,
  };
}

export function buildNovelSystemPrompt() {
  return [
    '你是专业的中文长篇网络小说协作作者。',
    '你的任务是继续写一部长篇连载，而不是输出写作建议。',
    '必须保持人物、世界观和时间线连续。',
    '参考作品只能作为世界观和主线参考，不要逐句模仿原文，不要照搬整段剧情。',
    '你必须严格返回 YAML Frontmatter + Markdown 正文，不要输出额外解释。',
  ].join('\n');
}

export function buildNovelOutlinePrompt(input: {
  project: NovelProject;
  targetVolumes?: number;
  chaptersPerVolume?: number;
}) {
  const targetVolumes = Math.max(1, Math.min(8, Math.round(input.targetVolumes ?? 3)));
  const chaptersPerVolume = Math.max(3, Math.min(20, Math.round(input.chaptersPerVolume ?? 8)));
  const { project } = input;

  return [
    '请为下面这个长篇小说项目生成“分卷 + 分章节”的连载大纲。',
    '只返回 Markdown，不要输出解释。',
    '格式要求：',
    '- 第一行是 `# 系列规划`',
    `- 共输出 ${targetVolumes} 卷`,
    `- 每卷规划约 ${chaptersPerVolume} 章`,
    '- 每一卷都要包含：卷名、卷目标、核心冲突、阶段高潮、结尾悬念',
    '- 每一章至少写：章名 + 一句话剧情推进',
    '- 如果有参考作品，只能借鉴节奏和世界观兼容方式，不要照搬原著剧情',
    '',
    `项目标题：${project.title}`,
    `核心设定：${project.premise}`,
    `题材方向：${project.genre || '未指定'}`,
    `写作目标：${project.writingGoals || '长篇稳定连载'}`,
    `参考作品：${project.referenceTitle || '无'}`,
    '',
    '参考作品公开梗概：',
    project.referenceSummary || '无',
    '',
    '参考约束：',
    project.referenceNotes || '无',
    '',
    '世界观 / 规则库：',
    project.worldBible || '无',
    '',
    '人物卡与关系：',
    project.characterBible || '无',
    '',
    '当前已有大纲：',
    project.outline || '无',
    '',
    '文风要求：',
    project.styleGuide || '无',
  ].join('\n');
}

export function buildNovelStoryBiblePrompt(input: {
  project: NovelProject;
}) {
  const { project } = input;

  return [
    '请把下面这个长篇小说项目整理成一套适合持续连载的 Story Bible。',
    '你必须只返回 JSON，不要输出解释。',
    '格式如下：',
    '{"writingGoals":"","worldBible":"","characterBible":"","styleGuide":""}',
    '要求：',
    '- writingGoals：提炼成 4 到 8 条项目目标，用项目符号风格，偏向更新策略、读者预期和节奏要求。',
    '- worldBible：写成可长期维护的世界观规则库，包含世界背景、势力、能力体系、关键禁忌和长期冲突。',
    '- characterBible：至少列出主角、主要对手、核心盟友，写明身份、动机、弱点、关系张力和成长方向。',
    '- styleGuide：写清楚叙事口吻、节奏、章节钩子、对话风格、禁忌和保持一致性的写法约束。',
    '- 如果项目已经有部分设定，请在保留其核心的基础上补全，不要推翻已有方向。',
    '',
    `项目标题：${project.title}`,
    `核心设定：${project.premise}`,
    `题材方向：${project.genre || '未指定'}`,
    `参考作品：${project.referenceTitle || '无'}`,
    '',
    '参考作品公开梗概：',
    project.referenceSummary || '无',
    '',
    '参考约束：',
    project.referenceNotes || '无',
    '',
    '当前写作目标：',
    project.writingGoals || '无',
    '',
    '当前世界观：',
    project.worldBible || '无',
    '',
    '当前人物卡：',
    project.characterBible || '无',
    '',
    '当前文风要求：',
    project.styleGuide || '无',
    '',
    '当前长线大纲：',
    project.outline || '无',
  ].join('\n');
}

export function buildNovelNextChapterPlanPrompt(input: {
  project: NovelProject;
  chapters: NovelChapter[];
  sources: NovelReferenceSource[];
  volumeNumber: number;
  chapterNumber: number;
}) {
  const { project } = input;

  return [
    '请根据下面这个长篇小说项目的既有大纲和连续记忆，生成“下一章任务卡”。',
    '你必须只返回 JSON，不要输出解释。',
    '格式如下：',
    '{"chapterRole":"","chapterTitleHint":"","titleDirection":"","chapterBrief":"","progressionChecklist":"","endingStrategy":"","endingNote":""}',
    '要求：',
    '- 先判断这一章在整条连载里的功能，再决定标题与结尾，不要每一章都写成同一种模式。',
    '- chapterRole：用中文概括本章功能，例如“开篇切入 / 过渡蓄势 / 关系推进 / 冲突升级 / 爆发对决 / 反转揭示 / 余波收束 / 阶段收官”这类。',
    '- chapterTitleHint：给出一个适合这一章功能的中文章名，允许有的章节偏事件名，有的偏地点名，有的偏人物状态，有的偏情绪或意象，不要总是同一种句式。',
    '- titleDirection：一句话说明这一章标题应该走什么方向，例如“地点切入型”“冲突直给型”“情绪余韵型”“信息揭示型”。',
    '- chapterBrief：用一段中文写清楚本章要推进的事件、冲突、角色关系变化和节奏要求，适合直接塞进续写输入框。',
    '- progressionChecklist：用项目符号列出本章必须完成的 3 到 5 个推进点。',
    '- endingStrategy：写明这一章结尾该采用哪种处理方式，例如“强悬念 / 轻悬念 / 情绪余韵 / 阶段收束 / 决策转场 / 信息反转”，并且要符合本章功能。',
    '- endingNote：用一句到两句中文写明这一章结尾具体应该怎么收，不是每章都必须硬留强悬念；有些章节可以收在情绪余韵、阶段完成或人物决定上。',
    '- 不能脱离当前大纲和连续记忆乱开新线。',
    '',
    `项目标题：${project.title}`,
    `核心设定：${project.premise}`,
    `题材方向：${project.genre || '未指定'}`,
    `参考作品：${project.referenceTitle || '无'}`,
    `当前要规划：第 ${input.volumeNumber} 卷 第 ${input.chapterNumber} 章`,
    '',
    '参考作品公开梗概：',
    project.referenceSummary || '无',
    '',
    '参考约束：',
    project.referenceNotes || '无',
    '',
    '写作目标：',
    project.writingGoals || '无',
    '',
    '世界观 / 规则库：',
    project.worldBible || '无',
    '',
    '人物卡与关系：',
    project.characterBible || '无',
    '',
    '长线大纲：',
    project.outline || '无',
    '',
    '连续性记忆：',
    project.continuityNotes || '无',
    '',
    '最近章节回顾：',
    buildRecentChapterDigest(input.chapters),
    '',
    '补充公开来源：',
    buildSourceDigest(input.sources),
  ].join('\n');
}

export function buildNovelChapterPrompt(input: NovelGenerationContext) {
  const { project } = input;
  const titleHint = String(input.chapterTitleHint ?? '').trim();
  const chapterRole = String(input.chapterRole ?? '').trim();
  const titleDirection = String(input.titleDirection ?? '').trim();
  const endingStrategy = String(input.endingStrategy ?? '').trim();
  const endingNote = String(input.endingNote ?? '').trim();

  const sections = [
    '请为下面这部正在连载的小说写出下一章，并保持前后文连续。',
    '输出格式必须是 YAML Frontmatter + Markdown 正文。',
    'Frontmatter 至少包含：title、slug、description、tags。',
    'Markdown 正文第一行必须是一级标题。',
    '写作要求：',
    `- ${getLengthInstruction(input.lengthPreset)}`,
    '- 不要把每一章都写成同一种模板化网文断章，应该先根据本章功能再决定写法。',
    '- 章节标题必须服从“本章功能”和“标题方向”，可以是事件名、地点名、人物状态或情绪意象，不要固定句式。',
    '- 结尾必须服从“结尾策略”；不是每章都要硬留强悬念，有些章节更适合收在情绪余韵、阶段完成、人物决断或信息揭示上。',
    '- 章节要像网文一样有清晰推进，结尾保留下一章动力。',
    '- 如果存在参考作品，请保持世界观兼容，但新的章节冲突和亮点必须围绕当前项目题目展开。',
    '- tags 至少包含“小说”“连载”和一个题材标签。',
    '',
    `项目标题：${project.title}`,
    `核心设定：${project.premise}`,
    `题材方向：${project.genre || '未指定'}`,
    `写作目标：${project.writingGoals || '持续连载，单章稳定更新'}`,
    `参考作品：${project.referenceTitle || '无'}`,
    `当前要写：第 ${input.volumeNumber} 卷 第 ${input.chapterNumber} 章`,
    titleHint ? `建议章名：${titleHint}` : '',
    chapterRole ? `本章功能：${chapterRole}` : '',
    titleDirection ? `标题方向：${titleDirection}` : '',
    `本章任务：${input.chapterBrief}`,
    endingStrategy ? `结尾策略：${endingStrategy}` : '',
    endingNote ? `结尾说明：${endingNote}` : '',
    '',
    '参考作品公开梗概：',
    project.referenceSummary || '无',
    '',
    '参考约束与补充笔记：',
    project.referenceNotes || '无',
    '',
    '世界观 / 规则库：',
    project.worldBible || '无',
    '',
    '人物卡与关系变化：',
    project.characterBible || '无',
    '',
    '长线大纲：',
    project.outline || '无',
    '',
    '连续性记忆：',
    project.continuityNotes || '无',
    '',
    '最近章节回顾：',
    buildRecentChapterDigest(input.chapters),
    '',
    '补充公开来源：',
    buildSourceDigest(input.sources),
  ].filter(Boolean);

  return sections.join('\n');
}

export async function generateNovelOutline(
  baseUrl: string,
  apiKey: string,
  model: string,
  input: {
    project: NovelProject;
    targetVolumes?: number;
    chaptersPerVolume?: number;
  },
) {
  const rawText = await generateCompatibleText(baseUrl, apiKey, model, {
    temperature: 0.55,
    systemPrompt: [
      '你是专业的中文长篇小说策划编辑。',
      '你的任务是把一个小说创意扩展成可持续连载的分卷 / 分章大纲。',
      '只返回 Markdown，不要输出解释，不要写成提示词。',
    ].join('\n'),
    userPrompt: buildNovelOutlinePrompt(input),
  });

  return stripFencedMarkdown(rawText);
}

export async function generateNovelStoryBible(
  baseUrl: string,
  apiKey: string,
  model: string,
  input: {
    project: NovelProject;
  },
) {
  const rawText = await generateCompatibleText(baseUrl, apiKey, model, {
    temperature: 0.45,
    systemPrompt: [
      '你是专业的中文长篇小说编辑。',
      '你的任务是把零散创意整理成适合长期连载维护的 Story Bible。',
      '你必须只返回 JSON，不要输出解释。',
    ].join('\n'),
    userPrompt: buildNovelStoryBiblePrompt(input),
  });

  const parsed = JSON.parse(extractJsonBlock(rawText)) as Partial<NovelStoryBible>;

  return {
    writingGoals: String(parsed.writingGoals ?? '').trim() || input.project.writingGoals,
    worldBible: String(parsed.worldBible ?? '').trim() || input.project.worldBible,
    characterBible: String(parsed.characterBible ?? '').trim() || input.project.characterBible,
    styleGuide: String(parsed.styleGuide ?? '').trim() || input.project.styleGuide,
  };
}

export async function generateNovelNextChapterPlan(
  baseUrl: string,
  apiKey: string,
  model: string,
  input: {
    project: NovelProject;
    chapters: NovelChapter[];
    sources: NovelReferenceSource[];
    volumeNumber: number;
    chapterNumber: number;
  },
) {
  const rawText = await generateCompatibleText(baseUrl, apiKey, model, {
    temperature: 0.5,
    systemPrompt: [
      '你是专业的中文长篇小说连载编辑。',
      '你的任务是根据现有大纲和记忆，为下一章生成可直接执行的任务卡。',
      '你必须只返回 JSON，不要输出解释。',
    ].join('\n'),
    userPrompt: buildNovelNextChapterPlanPrompt(input),
  });

  const parsed = JSON.parse(extractJsonBlock(rawText)) as Partial<NovelNextChapterPlan>;

  return {
    chapterRole: String(parsed.chapterRole ?? '').trim() || '主线推进',
    chapterTitleHint: String(parsed.chapterTitleHint ?? '').trim() || `第${input.chapterNumber}章`,
    titleDirection: String(parsed.titleDirection ?? '').trim() || '事件推进型',
    chapterBrief: String(parsed.chapterBrief ?? '').trim() || `请继续推进第 ${input.chapterNumber} 章的主线冲突，并在结尾保留下一章动力。`,
    progressionChecklist: String(parsed.progressionChecklist ?? '').trim(),
    endingStrategy: String(parsed.endingStrategy ?? '').trim() || '轻悬念',
    endingNote: String(parsed.endingNote ?? '').trim() || '结尾收在新的问题刚刚浮出水面即可，不必强行制造夸张断点。',
  };
}

export async function generateNovelMemoryUpdate(
  baseUrl: string,
  apiKey: string,
  model: string,
  input: {
    project: NovelProject;
    volumeNumber: number;
    chapterNumber: number;
    chapterTitle: string;
    chapterDescription: string;
    chapterContent: string;
  },
) {
  const rawText = await generateCompatibleText(baseUrl, apiKey, model, {
    temperature: 0.2,
    systemPrompt: [
      '你是长篇小说连续性编辑。',
      '你的任务是把新章节压缩成后续续写需要的记忆增量。',
      '只返回 JSON，不要输出解释。',
    ].join('\n'),
    userPrompt: [
      '请阅读下面这一章，并返回一个 JSON：',
      '{"summary":"","continuityDelta":""}',
      '要求：',
      '- summary：120 到 220 字，概括本章实际发生的事件。',
      '- continuityDelta：用中文项目符号，写明人物状态变化、新增设定、伏笔、冲突升级和下一章必须记住的约束。',
      `项目标题：${input.project.title}`,
      `当前章节：第 ${input.volumeNumber} 卷 第 ${input.chapterNumber} 章《${input.chapterTitle}》`,
      `已有连续性记忆：${input.project.continuityNotes || '无'}`,
      `本章摘要：${input.chapterDescription}`,
      '本章正文：',
      input.chapterContent.slice(0, 8_000),
    ].join('\n'),
  });

  const parsed = JSON.parse(extractJsonBlock(rawText)) as Partial<NovelMemoryUpdate>;

  return {
    summary: String(parsed.summary ?? '').trim() || input.chapterDescription,
    continuityDelta: String(parsed.continuityDelta ?? '').trim() || `- 第 ${input.chapterNumber} 章新增事件：${input.chapterDescription}`,
  };
}

export function mergeNovelContinuityNotes(
  existingNotes: string,
  volumeNumber: number,
  chapterNumber: number,
  chapterTitle: string,
  continuityDelta: string,
) {
  const normalizedExisting = existingNotes.trim();
  const normalizedDelta = continuityDelta.trim();
  const section = [
    `第 ${volumeNumber} 卷 第 ${chapterNumber} 章《${chapterTitle}》`,
    normalizedDelta || '暂无新增连续性备注。',
  ].join('\n');

  const merged = [normalizedExisting, section].filter(Boolean).join('\n\n---\n\n');

  if (merged.length <= 12_000) {
    return merged;
  }

  return merged.slice(Math.max(0, merged.length - 12_000)).trimStart();
}

export function buildNovelContinuityNotesFromChapters(
  chapters: Array<Pick<NovelChapter, 'volumeNumber' | 'chapterNumber' | 'title' | 'summary' | 'description' | 'continuityDelta'>>,
) {
  if (!chapters.length) {
    return '';
  }

  const ordered = [...chapters]
    .sort((left, right) => left.volumeNumber - right.volumeNumber || left.chapterNumber - right.chapterNumber);

  const sections = ordered.map((chapter) => {
    const summary = trimPromptText(chapter.summary || chapter.description || '', 220);
    const delta = String(chapter.continuityDelta ?? '').trim();
    const parts = [`第${chapter.volumeNumber} 卷 第${chapter.chapterNumber} 章《${chapter.title}》`];

    if (summary) {
      parts.push(`- 章节摘要：${summary}`);
    }

    if (delta) {
      parts.push(delta);
    }

    return parts.join('\n').trim();
  }).filter(Boolean);

  if (!sections.length) {
    return '';
  }

  const selected: string[] = [];
  let totalLength = 0;

  for (let index = sections.length - 1; index >= 0; index -= 1) {
    const section = sections[index];
    const separatorLength = selected.length ? '\n\n---\n\n'.length : 0;

    if (selected.length && totalLength + section.length + separatorLength > 12_000) {
      break;
    }

    selected.unshift(section);
    totalLength += section.length + separatorLength;
  }

  return selected.join('\n\n---\n\n');
}

export function getNextNovelChapterPosition(chapters: NovelChapter[]) {
  if (!chapters.length) {
    return {
      volumeNumber: 1,
      chapterNumber: 1,
    };
  }

  const latest = [...chapters]
    .sort((left, right) => right.volumeNumber - left.volumeNumber || right.chapterNumber - left.chapterNumber)[0];

  return {
    volumeNumber: latest.volumeNumber,
    chapterNumber: latest.chapterNumber + 1,
  };
}

export function buildNovelPostTags(project: Pick<NovelProject, 'title' | 'genre' | 'referenceTitle'>, generatedTags: string[]) {
  const rawTags = [
    ...generatedTags,
    '小说',
    '连载',
    project.genre,
    project.title,
    project.referenceTitle ? `${project.referenceTitle}衍生` : '',
  ];
  const seen = new Set<string>();

  return rawTags
    .map((tag) => String(tag ?? '').trim())
    .filter(Boolean)
    .filter((tag) => {
      const normalized = tag.toLowerCase();

      if (seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    })
    .slice(0, 8);
}
