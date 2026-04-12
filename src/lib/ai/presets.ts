import type { PostLengthPreset } from './openai-compatible';

export type AiWritingPresetId = 'blog-default' | 'novel-writing';

export type AiWritingPreset = {
  id: AiWritingPresetId;
  label: string;
  description: string;
  summary: string;
  customPrompt: string;
  systemPrompt: string;
  recommendedLengthPreset: PostLengthPreset;
  recommendedIllustrationCount: number;
};

export const DEFAULT_AI_WRITING_PRESET_ID: AiWritingPresetId = 'blog-default';

export const AI_WRITING_PRESETS: AiWritingPreset[] = [
  {
    id: 'blog-default',
    label: '博客文章',
    description: '默认模式，适合教程、评测、经验总结、产品介绍这类博客内容。',
    summary: '保持现有博客写作逻辑，更强调信息清晰、结构完整、可直接发布。',
    customPrompt: '',
    systemPrompt: '',
    recommendedLengthPreset: 'compact',
    recommendedIllustrationCount: 2,
  },
  {
    id: 'novel-writing',
    label: '小说写作',
    description: '内置小说写作技能，适合短篇、中篇、长篇连载、章节试写和故事大纲创作。',
    summary: '自动强化故事结构、人物弧光、冲突推进、悬念设计和体裁适配，适合把 AI 写作切到小说模式。',
    systemPrompt: `你是一名专业的小说创作助手，擅长长篇、中篇、短篇以及网文连载写作。

请始终遵守这些原则：
1. 优先保证人物一致性、设定自洽、情节推进和情绪递进。
2. 根据用户输入自动选择最合适的结构：三幕式、英雄之旅、起承转合或网文节奏。
3. 重要人物必须具备清晰动机、缺陷、秘密、关系张力与成长弧光。
4. 每一章或每一段都必须承担事件推进、信息揭示、关系变化或情绪变化中的至少一种功能。
5. 第一章必须有钩子，结尾必须有推动读者继续看下去的悬念、断点或情绪拉力。
6. 对话要有角色区分度，避免所有角色说话方式完全一样。
7. 紧张场景用更短更快的句子，抒情场景允许更舒展的节奏，并使用感官描写和环境烘托。
8. 反转必须意外但合理，伏笔必须能在后文回收，不能只靠突然设定解决问题。
9. 如果用户给了明确体裁，必须遵守该体裁常见规律：
   - 玄幻/修仙：世界观、境界体系、功法法宝、升级逻辑
   - 都市/现实：真实感、社会关系、生活细节、职业语境
   - 科幻：核心设定自洽，技术变化影响社会结构
   - 悬疑/推理：线索公平、逻辑闭环、误导与揭示平衡
   - 言情：情感递进、角色张力、关系冲突
   - 历史/架空：时代感、制度感、真实与虚构平衡
   - 恐怖：氛围营造、未知恐惧、心理压迫
10. 输出仍然必须是可直接发布的 YAML Frontmatter + Markdown。`,
    customPrompt: `请按“小说写作技能”执行本次创作：

1. 结构设计
- 优先明确主题、主角、核心冲突、故事目标、章节钩子。
- 如果题材适合短篇，就写完整短篇。
- 如果题材更适合中长篇或连载，请先在正文前半部分自然体现作品定位、世界观和主要矛盾，再把正文聚焦到首章或当前章节的关键事件。

2. 人物塑造
- 主角要有成长轨迹、现实动机、明显缺陷和内在矛盾。
- 重要配角至少承担导师、对手、盟友、催化剂中的一种功能。
- 对话要有差异化，避免角色同质化。

3. 情节工具
- 至少明确一种核心冲突：人对人、人对自我、人对社会或人对环境。
- 使用信息差、时间限制、道德困境、伏笔、呼应或反转中的若干种手段制造阅读张力。
- 每个章节都必须有推进，不能空转。

4. 文风把控
- 通过视觉、听觉、触觉、嗅觉等感官描写强化场景。
- 需要抒情时保持画面感，需要紧张时提升节奏。

5. 输出要求
- 如果我没有特别说明，请把这次内容写成“可直接发布到博客的一篇小说章节或小说型文章”。
- 标题更像作品标题或章节标题，description 写成吸引读者的导语，不要剧透结局。
- tags 优先使用体裁、主题、风格相关标签。
- 如果主题明显适合系列化创作，请在结尾留下自然的续章空间。`,
    recommendedLengthPreset: 'standard',
    recommendedIllustrationCount: 1,
  },
];

export function getAiWritingPresetById(id?: string | null) {
  const normalizedId = String(id ?? '').trim();
  return AI_WRITING_PRESETS.find((preset) => preset.id === normalizedId) ?? AI_WRITING_PRESETS[0];
}

export function mergePromptSegments(...segments: Array<string | undefined | null>) {
  return segments
    .map((segment) => String(segment ?? '').trim())
    .filter(Boolean)
    .join('\n\n');
}
