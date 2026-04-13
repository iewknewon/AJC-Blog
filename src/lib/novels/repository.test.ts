import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mapNovelProjectRow,
  normalizeNovelProjectInput,
  toNovelProjectInput,
} from './repository';

test('normalizeNovelProjectInput 会标准化可选字段', () => {
  const normalized = normalizeNovelProjectInput({
    slug: ' token-emperor ',
    title: 'Token Emperor',
    premise: '续写斗气大陆的新故事',
    genre: '玄幻',
    writingGoals: '长期连载',
    referenceTitle: ' 斗破苍穹 ',
    referenceSummary: ' 公开梗概 ',
    referenceNotes: '',
    worldBible: '大陆势力',
    characterBible: '主角设定',
    outline: '第一卷',
    styleGuide: '快节奏',
    continuityNotes: '',
    status: 'planning',
  });

  assert.equal(normalized.slug, 'token-emperor');
  assert.equal(normalized.referenceTitle, '斗破苍穹');
  assert.equal(normalized.referenceNotes, null);
  assert.equal(normalized.status, 'planning');
});

test('mapNovelProjectRow 会把查询行转成领域对象并解析统计字段', () => {
  const project = mapNovelProjectRow({
    id: 'novel-1',
    slug: 'token-emperor',
    title: 'Token Emperor',
    premise: '续写',
    genre: '玄幻',
    writing_goals: '长期连载',
    reference_title: '斗破苍穹',
    reference_summary: 'summary',
    reference_notes: 'notes',
    world_bible: 'world',
    character_bible: 'characters',
    outline: 'outline',
    style_guide: 'style',
    continuity_notes: 'continuity',
    status: 'serializing',
    created_at: '2026-04-13T00:00:00.000Z',
    updated_at: '2026-04-13T01:00:00.000Z',
    chapters_count: '8',
    last_chapter_number: '8',
    last_volume_number: '1',
  });

  assert.equal(project.chaptersCount, 8);
  assert.equal(project.lastChapterNumber, 8);
  assert.equal(project.lastVolumeNumber, 1);
  assert.equal(project.referenceTitle, '斗破苍穹');
});

test('toNovelProjectInput 会保留可编辑字段', () => {
  const input = toNovelProjectInput({
    slug: 'token-emperor',
    title: '斗破苍穹番外篇之 Token 大帝',
    premise: '新的主线',
    genre: '玄幻',
    writingGoals: '周更',
    referenceTitle: '斗破苍穹',
    referenceSummary: '梗概',
    referenceNotes: '设定约束',
    worldBible: '世界',
    characterBible: '人物',
    outline: '大纲',
    styleGuide: '风格',
    continuityNotes: '记忆',
    status: 'planning',
  });

  assert.equal(input.referenceTitle, '斗破苍穹');
  assert.equal(input.continuityNotes, '记忆');
});
