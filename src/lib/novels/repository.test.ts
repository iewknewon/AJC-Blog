import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deleteNovelChapterByPostId,
  getPublishedNovelChapterByPosition,
  getPublishedNovelChapterRouteByPostSlug,
  getPublishedNovelPostIds,
  mapPublishedNovelChapterRow,
  mapPublishedNovelProjectRow,
  mapNovelProjectRow,
  normalizeNovelProjectInput,
  syncNovelChapterByPost,
  toNovelProjectInput,
  updateNovelChapterMemory,
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

test('mapPublishedNovelProjectRow 会补齐前台展示字段', () => {
  const project = mapPublishedNovelProjectRow({
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
    chapters_count: '12',
    last_chapter_number: '12',
    last_volume_number: '2',
    latest_published_at: '2026-04-13T02:00:00.000Z',
    latest_chapter_title: '风起乌坦城',
    cover_image: 'https://example.com/cover.jpg',
  });

  assert.equal(project.chaptersCount, 12);
  assert.equal(project.lastVolumeNumber, 2);
  assert.equal(project.latestChapterTitle, '风起乌坦城');
  assert.equal(project.latestPublishedAt?.toISOString(), '2026-04-13T02:00:00.000Z');
  assert.equal(project.cover, 'https://example.com/cover.jpg');
});

test('mapPublishedNovelChapterRow 会把章节和已发布文章拼成阅读对象', () => {
  const chapter = mapPublishedNovelChapterRow({
    id: 'chapter-1',
    project_id: 'novel-1',
    volume_number: 2,
    chapter_number: 8,
    title: '风起乌坦城',
    description: '新的风暴已经出现。',
    brief: '继续推进主线',
    summary: '本章摘要',
    continuity_delta: '新增设定',
    post_id: 'post-1',
    post_slug: 'legacy-slug',
    status: 'published',
    created_at: '2026-04-13T00:00:00.000Z',
    updated_at: '2026-04-13T01:00:00.000Z',
    current_post_slug: 'token-emperor-v2-c8',
    post_title: '风起乌坦城',
    post_description: '新的风暴已经出现。',
    post_content: '# 正文',
    post_tags: '["小说","玄幻"]',
    post_cover: 'https://example.com/chapter-cover.jpg',
    post_featured: 0,
    post_status: 'published',
    post_published_at: '2026-04-13T03:00:00.000Z',
    post_created_at: '2026-04-13T02:00:00.000Z',
    post_updated_at: '2026-04-13T03:00:00.000Z',
  });

  assert.equal(chapter.volumeNumber, 2);
  assert.equal(chapter.chapterNumber, 8);
  assert.equal(chapter.cover, 'https://example.com/chapter-cover.jpg');
  assert.equal(chapter.post.slug, 'token-emperor-v2-c8');
  assert.deepEqual(chapter.post.tags, ['小说', '玄幻']);
  assert.equal(chapter.publishedAt?.toISOString(), '2026-04-13T03:00:00.000Z');
});

test('getPublishedNovelChapterByPosition 会按卷章查询公开章节', async () => {
  let batchCalls = 0;
  let boundValues: unknown[] = [];

  const db = {
    async batch() {
      batchCalls += 1;
      return [];
    },
    prepare() {
      return {
        bind(...values: unknown[]) {
          boundValues = values;

          return {
            async first() {
              return {
                id: 'chapter-1',
                project_id: 'novel-1',
                volume_number: 1,
                chapter_number: 3,
                title: '第三章',
                description: '剧情进入新阶段',
                brief: 'brief',
                summary: 'summary',
                continuity_delta: 'delta',
                post_id: 'post-1',
                post_slug: 'legacy-slug',
                status: 'published',
                created_at: '2026-04-13T00:00:00.000Z',
                updated_at: '2026-04-13T01:00:00.000Z',
                current_post_slug: 'token-emperor-v1-c3',
                post_title: '第三章',
                post_description: '剧情进入新阶段',
                post_content: '正文',
                post_tags: '["小说"]',
                post_cover: null,
                post_featured: 0,
                post_status: 'published',
                post_published_at: '2026-04-13T03:00:00.000Z',
                post_created_at: '2026-04-13T02:00:00.000Z',
                post_updated_at: '2026-04-13T03:00:00.000Z',
              };
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  const chapter = await getPublishedNovelChapterByPosition(db, 'novel-1', 1, 3);

  assert.equal(batchCalls, 1);
  assert.deepEqual(boundValues, ['novel-1', 1, 3]);
  assert.equal(chapter?.post.slug, 'token-emperor-v1-c3');
  assert.equal(chapter?.title, '第三章');
});
test('getPublishedNovelPostIds returns published novel post ids', async () => {
  let batchCalls = 0;

  const db = {
    async batch() {
      batchCalls += 1;
      return [];
    },
    prepare() {
      return {
        async all() {
          return {
            results: [
              { post_id: 'post-1' },
              { post_id: 'post-2' },
              { post_id: null },
            ],
          };
        },
      };
    },
  } as unknown as D1Database;

  const result = await getPublishedNovelPostIds(db);

  assert.equal(batchCalls, 1);
  assert.deepEqual(result, ['post-1', 'post-2']);
});

test('getPublishedNovelChapterRouteByPostSlug returns front route info', async () => {
  let batchCalls = 0;
  let boundValue = '';

  const db = {
    async batch() {
      batchCalls += 1;
      return [];
    },
    prepare() {
      return {
        bind(value: string) {
          boundValue = value;

          return {
            async first() {
              return {
                project_slug: 'token-emperor',
                volume_number: 2,
                chapter_number: 9,
              };
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  const route = await getPublishedNovelChapterRouteByPostSlug(db, 'token-emperor-v2-c9');

  assert.equal(batchCalls, 1);
  assert.equal(boundValue, 'token-emperor-v2-c9');
  assert.deepEqual(route, {
    projectSlug: 'token-emperor',
    volumeNumber: 2,
    chapterNumber: 9,
  });
});

test('syncNovelChapterByPost updates linked chapter snapshot', async () => {
  let batchCalls = 0;
  const calls: Array<{ sql: string; values: unknown[] }> = [];

  const db = {
    async batch() {
      batchCalls += 1;
      return [];
    },
    prepare(sql: string) {
      return {
        async run() {
          calls.push({ sql, values: [] });
          return { success: true };
        },
        bind(...values: unknown[]) {
          calls.push({ sql, values });

          return {
            async run() {
              return { success: true };
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  await syncNovelChapterByPost(db, {
    id: 'post-9',
    slug: 'token-emperor-v2-c9',
    title: '第九章 新标题',
    description: '最新的章节摘要',
    status: 'published',
  });

  assert.equal(batchCalls, 1);
  const updateCall = calls.find((call) => /UPDATE novel_chapters/.test(call.sql));
  assert.ok(updateCall);
  assert.equal(updateCall.values[0], '第九章 新标题');
  assert.equal(updateCall.values[1], '最新的章节摘要');
  assert.equal(updateCall.values[2], '最新的章节摘要');
  assert.equal(updateCall.values[3], '- 当前章节摘要：最新的章节摘要');
  assert.equal(updateCall.values[4], 'token-emperor-v2-c9');
  assert.equal(updateCall.values[5], 'published');
  assert.equal(updateCall.values[7], 'post-9');
});

test('deleteNovelChapterByPostId removes linked chapter rows', async () => {
  let batchCalls = 0;
  const calls: Array<{ sql: string; values: unknown[] }> = [];

  const db = {
    async batch() {
      batchCalls += 1;
      return [];
    },
    prepare(sql: string) {
      return {
        async run() {
          calls.push({ sql, values: [] });
          return { success: true };
        },
        bind(...values: unknown[]) {
          calls.push({ sql, values });

          return {
            async run() {
              return { success: true };
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  await deleteNovelChapterByPostId(db, 'post-3');

  assert.equal(batchCalls, 1);
  const deleteCall = calls.find((call) => /DELETE FROM novel_chapters/.test(call.sql) && call.values.length > 0);
  assert.ok(deleteCall);
  assert.deepEqual(deleteCall.values, ['post-3']);
});

test('updateNovelChapterMemory updates chapter summary and continuity delta', async () => {
  let batchCalls = 0;
  const calls: Array<{ sql: string; values: unknown[] }> = [];

  const db = {
    async batch() {
      batchCalls += 1;
      return [];
    },
    prepare(sql: string) {
      return {
        async run() {
          calls.push({ sql, values: [] });
          return { success: true };
        },
        bind(...values: unknown[]) {
          calls.push({ sql, values });

          return {
            async run() {
              return { success: true };
            },
            async first() {
              return {
                id: 'chapter-3',
                project_id: 'novel-1',
                volume_number: 1,
                chapter_number: 3,
                title: '新标题',
                description: '新描述',
                brief: 'brief',
                summary: '重建后的摘要',
                continuity_delta: '- 新的连续记忆',
                post_id: 'post-3',
                post_slug: 'post-3',
                status: 'draft',
                created_at: '2026-04-01T00:00:00.000Z',
                updated_at: '2026-04-01T00:00:00.000Z',
              };
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  const chapter = await updateNovelChapterMemory(db, 'chapter-3', {
    title: '新标题',
    description: '新描述',
    summary: '重建后的摘要',
    continuityDelta: '- 新的连续记忆',
  });

  assert.equal(batchCalls, 1);
  const updateCall = calls.find((call) => /UPDATE novel_chapters/.test(call.sql));
  assert.ok(updateCall);
  assert.equal(updateCall.values[0], '新标题');
  assert.equal(updateCall.values[1], '新描述');
  assert.equal(updateCall.values[2], '重建后的摘要');
  assert.equal(updateCall.values[3], '- 新的连续记忆');
  assert.equal(updateCall.values[5], 'chapter-3');
  assert.equal(chapter?.summary, '重建后的摘要');
});
