import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildNovelChapterPrompt,
  buildNovelNextChapterPlanPrompt,
  buildNovelOutlinePrompt,
  buildNovelProjectBlueprintPrompt,
  buildNovelPostTags,
  buildNovelResearchQuery,
  buildNovelStoryBiblePrompt,
  getNextNovelChapterPosition,
  mergeNovelContinuityNotes,
} from './novels';

test('buildNovelProjectBlueprintPrompt 会包含创意描述和参考作品', () => {
  const prompt = buildNovelProjectBlueprintPrompt({
    title: '斗气 Token 传',
    concept: '把斗气体系替换成 Token 体系，主角通过链上异火成长。',
    referenceTitle: '斗破苍穹',
  });

  assert.match(prompt, /创意描述/);
  assert.match(prompt, /斗破苍穹/);
  assert.match(prompt, /slug/);
  assert.match(prompt, /Token 体系/);
});

test('buildNovelResearchQuery 会优先使用参考作品名', () => {
  const query = buildNovelResearchQuery({
    title: '斗破苍穹番外篇之 Token 大帝',
    referenceTitle: '斗破苍穹',
    genre: '玄幻',
    premise: '新的斗帝传说',
  });

  assert.match(query, /斗破苍穹/);
  assert.match(query, /世界观/);
});

test('buildNovelChapterPrompt 会包含连续记忆和前文章节', () => {
  const prompt = buildNovelChapterPrompt({
    project: {
      id: 'novel-1',
      slug: 'token-emperor',
      title: '斗破苍穹番外篇之 Token 大帝',
      premise: '主角误入区块链异火秘境',
      genre: '玄幻',
      writingGoals: '长篇连载',
      referenceTitle: '斗破苍穹',
      referenceSummary: '斗气大陆与异火体系仍然有效。',
      referenceNotes: '萧炎已经成帝，旧主角不能被随意削弱。',
      worldBible: '斗气大陆依旧由各方势力割据。',
      characterBible: '主角林策，拥有链纹斗气。',
      outline: '第一卷寻找失落异火。',
      styleGuide: '快节奏，章节结尾留悬念。',
      continuityNotes: '林策已经暴露了体内的异火气息。',
      status: 'serializing',
      chaptersCount: 2,
      lastChapterNumber: 2,
      lastVolumeNumber: 1,
      createdAt: new Date('2026-04-13T00:00:00.000Z'),
      updatedAt: new Date('2026-04-13T00:00:00.000Z'),
    },
    chapters: [
      {
        id: 'chapter-1',
        projectId: 'novel-1',
        volumeNumber: 1,
        chapterNumber: 1,
        title: '异火初现',
        description: '主角首次感知异火召唤。',
        brief: '',
        summary: '林策在黑角域边缘感知到失控异火，并被追杀。',
        continuityDelta: '',
        status: 'draft',
        createdAt: new Date('2026-04-13T00:00:00.000Z'),
        updatedAt: new Date('2026-04-13T00:00:00.000Z'),
      },
    ],
    sources: [],
    volumeNumber: 1,
    chapterNumber: 2,
    chapterBrief: '让主角在交易中首次见到反派势力，并埋下新的异火伏笔。',
    chapterTitleHint: '黑市交易',
    chapterRole: '冲突升级',
    titleDirection: '事件直给型',
    endingStrategy: '轻悬念',
    endingNote: '结尾收在主角意识到有人在暗中盯上他，不必硬切断。',
    lengthPreset: 'tight',
  });

  assert.match(prompt, /连续性记忆/);
  assert.match(prompt, /异火初现/);
  assert.match(prompt, /黑市交易/);
  assert.match(prompt, /本章功能/);
  assert.match(prompt, /结尾策略/);
});

test('buildNovelOutlinePrompt 会要求输出分卷和章节骨架', () => {
  const prompt = buildNovelOutlinePrompt({
    project: {
      id: 'novel-1',
      slug: 'token-emperor',
      title: '斗破苍穹番外篇之 Token 大帝',
      premise: '主角误入区块链异火秘境',
      genre: '玄幻',
      writingGoals: '长篇连载',
      referenceTitle: '斗破苍穹',
      referenceSummary: '斗气大陆与异火体系仍然有效。',
      referenceNotes: '萧炎已经成帝，旧主角不能被随意削弱。',
      worldBible: '斗气大陆依旧由各方势力割据。',
      characterBible: '主角林策，拥有链纹斗气。',
      outline: '',
      styleGuide: '快节奏，章节结尾留悬念。',
      continuityNotes: '',
      status: 'planning',
      chaptersCount: 0,
      lastChapterNumber: 0,
      lastVolumeNumber: 1,
      createdAt: new Date('2026-04-13T00:00:00.000Z'),
      updatedAt: new Date('2026-04-13T00:00:00.000Z'),
    },
    targetVolumes: 3,
    chaptersPerVolume: 8,
  });

  assert.match(prompt, /系列规划/);
  assert.match(prompt, /共输出 3 卷/);
  assert.match(prompt, /每卷规划约 8 章/);
});

test('buildNovelStoryBiblePrompt 会要求输出人物卡和世界观', () => {
  const prompt = buildNovelStoryBiblePrompt({
    project: {
      id: 'novel-1',
      slug: 'token-emperor',
      title: '斗破苍穹番外篇之 Token 大帝',
      premise: '主角误入区块链异火秘境',
      genre: '玄幻',
      writingGoals: '长篇连载',
      referenceTitle: '斗破苍穹',
      referenceSummary: '斗气大陆与异火体系仍然有效。',
      referenceNotes: '萧炎已经成帝，旧主角不能被随意削弱。',
      worldBible: '',
      characterBible: '',
      outline: '',
      styleGuide: '',
      continuityNotes: '',
      status: 'planning',
      chaptersCount: 0,
      lastChapterNumber: 0,
      lastVolumeNumber: 1,
      createdAt: new Date('2026-04-13T00:00:00.000Z'),
      updatedAt: new Date('2026-04-13T00:00:00.000Z'),
    },
  });

  assert.match(prompt, /Story Bible/);
  assert.match(prompt, /characterBible/);
  assert.match(prompt, /worldBible/);
  assert.match(prompt, /styleGuide/);
});

test('buildNovelNextChapterPlanPrompt 会要求输出下一章任务卡', () => {
  const prompt = buildNovelNextChapterPlanPrompt({
    project: {
      id: 'novel-1',
      slug: 'token-emperor',
      title: '斗破苍穹番外篇之 Token 大帝',
      premise: '主角误入区块链异火秘境',
      genre: '玄幻',
      writingGoals: '长篇连载',
      referenceTitle: '斗破苍穹',
      referenceSummary: '斗气大陆与异火体系仍然有效。',
      referenceNotes: '萧炎已经成帝，旧主角不能被随意削弱。',
      worldBible: '斗气大陆依旧由各方势力割据。',
      characterBible: '主角林策，拥有链纹斗气。',
      outline: '第一卷寻找失落异火。',
      styleGuide: '快节奏，章节结尾留悬念。',
      continuityNotes: '林策已经暴露了体内的异火气息。',
      status: 'serializing',
      chaptersCount: 1,
      lastChapterNumber: 1,
      lastVolumeNumber: 1,
      createdAt: new Date('2026-04-13T00:00:00.000Z'),
      updatedAt: new Date('2026-04-13T00:00:00.000Z'),
    },
    chapters: [
      {
        id: 'chapter-1',
        projectId: 'novel-1',
        volumeNumber: 1,
        chapterNumber: 1,
        title: '异火初现',
        description: '主角首次感知异火召唤。',
        brief: '',
        summary: '林策在黑角域边缘感知到失控异火，并被追杀。',
        continuityDelta: '',
        status: 'draft',
        createdAt: new Date('2026-04-13T00:00:00.000Z'),
        updatedAt: new Date('2026-04-13T00:00:00.000Z'),
      },
    ],
    sources: [],
    volumeNumber: 1,
    chapterNumber: 2,
  });

  assert.match(prompt, /下一章任务卡/);
  assert.match(prompt, /chapterTitleHint/);
  assert.match(prompt, /chapterRole/);
  assert.match(prompt, /titleDirection/);
  assert.match(prompt, /endingStrategy/);
  assert.match(prompt, /endingNote/);
});

test('mergeNovelContinuityNotes 会追加新章节记忆', () => {
  const notes = mergeNovelContinuityNotes('旧笔记', 1, 3, '黑市交易', '- 主角第一次见到幕后黑手');

  assert.match(notes, /旧笔记/);
  assert.match(notes, /黑市交易/);
  assert.match(notes, /幕后黑手/);
});

test('getNextNovelChapterPosition 会返回下一章序号', () => {
  const next = getNextNovelChapterPosition([
    {
      id: 'chapter-2',
      projectId: 'novel-1',
      volumeNumber: 1,
      chapterNumber: 2,
      title: '第二章',
      description: 'desc',
      brief: '',
      summary: '',
      continuityDelta: '',
      status: 'draft',
      createdAt: new Date('2026-04-13T00:00:00.000Z'),
      updatedAt: new Date('2026-04-13T00:00:00.000Z'),
    },
  ]);

  assert.deepEqual(next, {
    volumeNumber: 1,
    chapterNumber: 3,
  });
});

test('buildNovelPostTags 会补齐小说和参考标签', () => {
  const tags = buildNovelPostTags({
    title: 'Token 大帝',
    genre: '玄幻',
    referenceTitle: '斗破苍穹',
  }, ['异火', '番外']);

  assert.deepEqual(tags.slice(0, 5), ['异火', '番外', '小说', '连载', '玄幻']);
  assert.match(tags.join(','), /斗破苍穹衍生/);
});
