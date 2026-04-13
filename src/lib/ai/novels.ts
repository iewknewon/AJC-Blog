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

type NovelGenerationContext = {
  project: NovelProject;
  chapters: NovelChapter[];
  sources: NovelReferenceSource[];
  volumeNumber: number;
  chapterNumber: number;
  chapterBrief: string;
  chapterTitleHint?: string;
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

export function buildNovelResearchQuery(project: Pick<NovelProject, 'title' | 'referenceTitle' | 'genre' | 'premise'>) {
  const referenceTitle = String(project.referenceTitle ?? '').trim();
  const seed = referenceTitle || project.title.trim();
  const genre = project.genre.trim();

  return [seed, genre, '小说 人物 世界观 剧情 梗概'].filter(Boolean).join(' ');
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

export function buildNovelChapterPrompt(input: NovelGenerationContext) {
  const { project } = input;
  const titleHint = String(input.chapterTitleHint ?? '').trim();

  const sections = [
    '请为下面这部正在连载的小说写出下一章，并保持前后文连续。',
    '输出格式必须是 YAML Frontmatter + Markdown 正文。',
    'Frontmatter 至少包含：title、slug、description、tags。',
    'Markdown 正文第一行必须是一级标题。',
    '写作要求：',
    `- ${getLengthInstruction(input.lengthPreset)}`,
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
    `本章任务：${input.chapterBrief}`,
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
