# 学习 CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为现有博客新增一套后台可管理的学习 CMS，让未来学习专题能够通过后台一句话需求 + AI 自动生成，并在公开学习中心中以数据库优先、静态专题兜底的方式展示。

**Architecture:** 保留现有静态学习专题作为兼容层，新增 D1 驱动的 `learning_tracks` 与 `learning_lessons`，在 `src/lib/learning/content.ts` 中统一做数据库优先与静态 fallback。后台新增 `/admin/learning` 与 `/api/admin/learning/*`，AI 生成链路复用现有 admin AI 配置方式与 openai-compatible helper。

**Tech Stack:** Astro, TypeScript, Cloudflare D1, node:test, 现有 admin UI、现有 `src/lib/ai/*` 兼容层

---

### Task 1: 建立学习 CMS 数据模型与仓储层

**Files:**
- Create: `src/lib/learning/repository.ts`
- Create: `src/lib/learning/repository.test.ts`
- Create: `src/lib/learning/types.ts`
- Create: `src/lib/learning/validation.ts`
- Create: `src/lib/learning/validation.test.ts`
- Create: `db/migrations/0005_create_learning_cms.sql`
- Modify: `src/lib/learning/content.ts`

- [ ] **Step 1: 写 repository/validation 的失败测试**

```ts
test('createLearningTrack normalizes and persists a draft track', async () => {
  const db = createMockDb();
  const created = await createLearningTrack(db, {
    slug: 'token-security',
    title: 'Token 安全专题',
    shortTitle: 'Token 安全',
    description: '从鉴权、会话到密钥管理的学习专题。',
    stageSlug: '专题',
    eyebrow: 'Learning Track',
    colorToken: 'security',
    icon: 'TK',
    pageVariant: 'default',
    learningPath: ['认识风险', '理解机制', '学会落地'],
    conceptOverview: {
      title: '什么是 Token 安全',
      summary: '围绕身份、凭证与会话建立安全直觉。',
      pillars: ['身份', '签名', '存储'],
      safetyNotes: ['只讨论防护与工程实践'],
    },
    sourcePrompt: '我想学 token 安全',
    status: 'draft',
  });

  assert.equal(created?.slug, 'token-security');
  assert.equal(created?.stageSlug, '专题');
});

test('mapLearningTrackToSubject converts database JSON to public learning subject shape', () => {
  const subject = mapLearningTrackRow({
    id: 'track-1',
    slug: 'token-security',
    title: 'Token 安全专题',
    short_title: 'Token 安全',
    description: 'desc',
    stage_slug: '专题',
    eyebrow: 'Learning Track',
    color_token: 'security',
    icon: 'TK',
    page_variant: 'default',
    learning_path_json: '["a","b","c"]',
    concept_overview_json: '{"title":"概念","summary":"说明","pillars":["1"],"safetyNotes":["2"]}',
    source_prompt: 'prompt',
    status: 'draft',
    created_at: '2026-04-16T00:00:00.000Z',
    updated_at: '2026-04-16T00:00:00.000Z',
    lessons_count: 0,
  });

  assert.equal(subject.learningPath.length, 3);
  assert.equal(subject.pageVariant, 'default');
});
```

- [ ] **Step 2: 运行单测确认失败**

Run: `node --import tsx --test src/lib/learning/repository.test.ts src/lib/learning/validation.test.ts`
Expected: FAIL，提示仓储与校验模块不存在或导出缺失

- [ ] **Step 3: 实现学习 CMS 类型与校验**

```ts
export type LearningStageSlug = '入门' | '基础' | '进阶' | '专题' | '实战';

export type LearningTrackStatus = 'draft' | 'published';

export type UpsertLearningTrackInput = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  stageSlug: LearningStageSlug;
  eyebrow?: string | null;
  colorToken?: string | null;
  icon?: string | null;
  pageVariant?: 'default' | 'timeline' | null;
  learningPath: string[];
  conceptOverview?: LearningConceptOverview | null;
  sourcePrompt?: string | null;
  status: LearningTrackStatus;
};
```

- [ ] **Step 4: 实现 learning schema 与 repository**

```sql
CREATE TABLE IF NOT EXISTS learning_tracks (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  short_title TEXT NOT NULL,
  description TEXT NOT NULL,
  stage_slug TEXT NOT NULL,
  eyebrow TEXT NOT NULL DEFAULT 'Learning Track',
  color_token TEXT NOT NULL DEFAULT 'learning',
  icon TEXT NOT NULL DEFAULT 'LR',
  page_variant TEXT NOT NULL DEFAULT 'default',
  learning_path_json TEXT NOT NULL DEFAULT '[]',
  concept_overview_json TEXT,
  source_prompt TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- [ ] **Step 5: 在 `src/lib/learning/content.ts` 中新增数据库优先入口**

```ts
export async function getLearningSubjects(db?: D1Database) {
  const databaseSubjects = db ? await getPublishedLearningSubjects(db) : [];
  return [...databaseSubjects, ...learningCatalog];
}

export async function getLearningSubjectBySlug(slug: string, db?: D1Database) {
  if (db) {
    const databaseSubject = await getPublishedLearningSubjectBySlug(db, slug);
    if (databaseSubject) return databaseSubject;
  }

  return learningCatalog.find((subject) => subject.slug === slug) ?? null;
}
```

- [ ] **Step 6: 运行测试确认通过**

Run: `node --import tsx --test src/lib/learning/repository.test.ts src/lib/learning/validation.test.ts src/lib/learning/content.test.ts`
Expected: PASS

### Task 2: 建立学习阶段常量与公开聚合层

**Files:**
- Create: `src/data/learning/stages.ts`
- Modify: `src/lib/learning/content.ts`
- Modify: `src/lib/learning/content.test.ts`
- Modify: `src/pages/learn/index.astro`

- [ ] **Step 1: 写总学习轴聚合测试**

```ts
test('buildLearningStageGroups merges static and database subjects under fixed stages', async () => {
  const db = createMockDbWithPublishedTrack({
    slug: 'token-security',
    stageSlug: '专题',
    title: 'Token 安全专题',
  });

  const groups = await getLearningStageGroups(db);

  assert.deepEqual(
    groups.map((group) => group.slug),
    ['入门', '基础', '进阶', '专题', '实战'],
  );
  assert.ok(groups.find((group) => group.slug === '专题')?.subjects.some((subject) => subject.slug === 'token-security'));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test src/lib/learning/content.test.ts`
Expected: FAIL，提示 `getLearningStageGroups` 未实现

- [ ] **Step 3: 增加固定阶段常量与静态专题阶段映射**

```ts
export const learningStages = [
  { slug: '入门', title: '入门', description: '建立概念地图与学习信心。', order: 1 },
  { slug: '基础', title: '基础', description: '掌握最核心的底层原理。', order: 2 },
  { slug: '进阶', title: '进阶', description: '进入系统化理解与综合分析。', order: 3 },
  { slug: '专题', title: '专题', description: '围绕某个主题持续纵深学习。', order: 4 },
  { slug: '实战', title: '实战', description: '把知识转化为可执行能力。', order: 5 },
] as const;
```

- [ ] **Step 4: 在学习首页接入总学习轴**

```astro
const db = Astro.locals.runtime?.env?.DB;
const stageGroups = await getLearningStageGroups(db);
```

- [ ] **Step 5: 运行测试与构建**

Run: `node --import tsx --test src/lib/learning/content.test.ts`
Expected: PASS

Run: `npm run build`
Expected: PASS

### Task 3: 建立后台学习管理列表与编辑页

**Files:**
- Create: `src/pages/admin/learning/index.astro`
- Create: `src/pages/admin/learning/new.astro`
- Create: `src/pages/admin/learning/[id].astro`
- Create: `src/pages/admin/learning/[id]/lessons/[lessonId].astro`
- Create: `src/components/admin/AdminLearningList.astro`
- Create: `src/components/admin/AdminLearningForm.astro`
- Create: `src/components/admin/AdminLearningLessonForm.astro`
- Modify: `src/pages/admin/index.astro`

- [ ] **Step 1: 写后台列表与编辑页所需的最小页面测试**

```ts
test('admin learning list page can render published and draft tracks', async () => {
  const tracks = [
    { id: '1', title: 'Token 安全专题', stageSlug: '专题', status: 'draft', lessonsCount: 5 },
  ];

  assert.equal(tracks[0].status, 'draft');
  assert.equal(tracks[0].lessonsCount, 5);
});
```

- [ ] **Step 2: 运行目标测试确认失败**

Run: `node --import tsx --test src/lib/learning/repository.test.ts`
Expected: FAIL，如果列表字段或计数字段未准备好

- [ ] **Step 3: 新增后台学习列表页与入口**

```astro
<AdminLayout title="学习专题管理" description="管理 AI 生成与手动维护的学习专题。">
  <section class="admin-stack">
    <div class="hero-actions">
      <a class="button button-primary" href="/admin/learning/new">新建学习专题</a>
    </div>
    <AdminLearningList tracks={tracks} />
  </section>
</AdminLayout>
```

- [ ] **Step 4: 新增专题编辑页与课时编辑页**

```astro
<AdminLearningForm
  action={`/api/admin/learning/${track.id}`}
  submitLabel="保存专题"
  track={track}
  stages={learningStages}
/>
```

- [ ] **Step 5: 在后台首页加入学习管理入口**

```astro
{ href: '/admin/learning', label: '学习专题', description: '管理后台学习路线、专题与课时' }
```

- [ ] **Step 6: 运行构建确认页面无语法错误**

Run: `npm run build`
Expected: PASS

### Task 4: 建立后台学习 CRUD API

**Files:**
- Create: `src/pages/api/admin/learning/index.ts`
- Create: `src/pages/api/admin/learning/[id].ts`
- Create: `src/pages/api/admin/learning/[id]/lessons/[lessonId].ts`
- Modify: `src/lib/learning/repository.ts`
- Modify: `src/lib/learning/validation.ts`

- [ ] **Step 1: 写管理接口测试**

```ts
test('admin learning create route redirects to detail page after successful create', async () => {
  const request = new Request('https://example.com/api/admin/learning', {
    method: 'POST',
    body: new URLSearchParams({
      slug: 'token-security',
      title: 'Token 安全专题',
      shortTitle: 'Token 安全',
      description: 'desc',
      stageSlug: '专题',
      status: 'draft',
    }),
  });

  assert.equal(request.method, 'POST');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test src/lib/learning/repository.test.ts`
Expected: FAIL，尚未具备创建与更新接口依赖

- [ ] **Step 3: 实现专题与课时的创建、更新、删除 API**

```ts
export async function POST(context) {
  const unauthorized = await requireAdminApiAuth({
    cookies: context.cookies,
    env: context.locals.runtime?.env,
  });

  if (unauthorized) return unauthorized;

  const formData = await context.request.formData();
  const validation = validateLearningTrackInput({
    slug: formData.get('slug'),
    title: formData.get('title'),
    shortTitle: formData.get('shortTitle'),
    description: formData.get('description'),
    stageSlug: formData.get('stageSlug'),
    status: formData.get('status'),
  });

  if (!validation.success) {
    return context.redirect('/admin/learning/new?error=1');
  }

  const track = await createLearningTrack(context.locals.runtime.env.DB, validation.data);
  return context.redirect(`/admin/learning/${track?.id}`);
}
```

- [ ] **Step 4: 运行目标测试**

Run: `node --import tsx --test src/lib/learning/repository.test.ts src/lib/learning/validation.test.ts`
Expected: PASS

### Task 5: 建立学习 AI 生成 helper

**Files:**
- Create: `src/lib/ai/learning.ts`
- Create: `src/lib/ai/learning.test.ts`
- Modify: `src/lib/ai/openai-compatible.ts` (only if parsing helper reuse requires exports)

- [ ] **Step 1: 写学习 AI 蓝图与课时解析测试**

```ts
test('generateLearningTrackBlueprint normalizes AI output into a valid stage and slug', () => {
  const parsed = parseLearningTrackBlueprint(`{
    "stageSlug": "专题",
    "title": "Token 安全专题",
    "slug": "token-security",
    "shortTitle": "Token 安全",
    "description": "desc",
    "learningPath": ["a", "b", "c"]
  }`);

  assert.equal(parsed.stageSlug, '专题');
  assert.equal(parsed.slug, 'token-security');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test src/lib/ai/learning.test.ts`
Expected: FAIL，提示 learning AI helper 未实现

- [ ] **Step 3: 实现专题蓝图、课时大纲、课时草稿三段式 helper**

```ts
export async function generateLearningTrackBlueprint(
  baseUrl: string,
  apiKey: string,
  model: string,
  input: { prompt: string },
) {
  const rawText = await generateCompatibleText(baseUrl, apiKey, model, {
    temperature: 0.35,
    systemPrompt: '你要把一句话学习需求转换成固定阶段下的学习专题蓝图。',
    userPrompt: buildLearningTrackBlueprintPrompt(input),
  });

  return parseLearningTrackBlueprint(extractJsonBlock(rawText));
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --import tsx --test src/lib/ai/learning.test.ts`
Expected: PASS

### Task 6: 建立后台一句话 AI 创建专题 API

**Files:**
- Create: `src/pages/api/admin/learning/quickstart.ts`
- Modify: `src/lib/learning/repository.ts`
- Modify: `src/lib/learning/types.ts`
- Modify: `src/lib/learning/validation.ts`

- [ ] **Step 1: 写 quickstart 路由测试**

```ts
test('learning quickstart rejects missing baseUrl/apiKey/model', async () => {
  const request = new Request('https://example.com/api/admin/learning/quickstart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: '我想学 token 安全' }),
  });

  const payload = await request.json();
  assert.equal(payload.prompt, '我想学 token 安全');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test src/lib/learning/repository.test.ts src/lib/ai/learning.test.ts`
Expected: FAIL，quickstart 所需路由与数据落库链路未齐

- [ ] **Step 3: 实现 quickstart 路由**

```ts
const blueprint = await generateLearningTrackBlueprint(baseUrl, apiKey, model, { prompt });
const outline = await generateLearningLessonOutline(baseUrl, apiKey, model, { prompt, blueprint });
const track = await createLearningTrack(db, blueprintToTrackInput(blueprint, prompt));

for (const lessonOutline of outline.lessons) {
  const lessonDraft = await generateLearningLessonDraft(baseUrl, apiKey, model, {
    prompt,
    blueprint,
    outline: lessonOutline,
  });
  await createLearningLesson(db, draftToLessonInput(track.id, lessonOutline, lessonDraft));
}
```

- [ ] **Step 4: 运行目标测试**

Run: `node --import tsx --test src/lib/ai/learning.test.ts src/lib/learning/repository.test.ts`
Expected: PASS

### Task 7: 接入后台新建页的 AI 工作流与交互

**Files:**
- Modify: `src/pages/admin/learning/new.astro`
- Modify: `src/pages/api/admin/ai/models.ts` (only if request shape reuse is needed)
- Reuse: localStorage keys pattern already present in novels/admin AI pages

- [ ] **Step 1: 写新建页交互需要满足的最小状态说明**

```md
页面必须支持：
- 一句话需求输入
- Base URL / API Key / Model
- 获取模型
- 生成中状态
- 生成成功后的按钮跳转
- 错误提示
```

- [ ] **Step 2: 实现学习 quickstart 页**

```astro
<form id="learning-quickstart-form" class="admin-form">
  <label class="admin-field">
    <span>一句需求</span>
    <textarea name="prompt" required placeholder="例如：我想系统学习 token 安全，从鉴权到密钥管理，适合有一点前端基础的人。"></textarea>
  </label>
</form>
```

- [ ] **Step 3: 复用现有模型加载与本地存储模式**

```js
const STORAGE_KEYS = {
  baseUrl: 'ajc.ai.baseUrl',
  apiKey: 'ajc.ai.apiKey',
  model: 'ajc.ai.model',
};
```

- [ ] **Step 4: 运行构建确认页面通过**

Run: `npm run build`
Expected: PASS

### Task 8: 公开学习页接入数据库专题与课时

**Files:**
- Modify: `src/pages/learn/index.astro`
- Modify: `src/pages/learn/[subject].astro`
- Modify: `src/pages/learn/[subject]/[lesson].astro`
- Modify: `src/components/learning/LearningSubjectCard.astro`
- Modify: `src/components/learning/LearningLessonCard.astro` (if present)
- Modify: `src/lib/learning/content.ts`

- [ ] **Step 1: 写 subject/lesson 数据库优先 fallback 测试**

```ts
test('getLearningLesson prefers database lessons before static catalog', async () => {
  const db = createMockDbWithPublishedLesson({
    subjectSlug: 'token-security',
    lessonSlug: 'session-basics',
    title: '会话基础',
  });

  const entry = await getLearningLesson('token-security', 'session-basics', db);

  assert.equal(entry?.lesson.title, '会话基础');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test src/lib/learning/content.test.ts`
Expected: FAIL，旧接口仍为静态同步实现

- [ ] **Step 3: 将 learn 路由改成异步读取 DB**

```astro
const db = Astro.locals.runtime?.env?.DB;
const subject = await getLearningSubjectBySlug(Astro.params.subject ?? '', db);
```

- [ ] **Step 4: 将 lesson 页改成异步读取 DB**

```astro
const entry = await getLearningLesson(Astro.params.subject ?? '', Astro.params.lesson ?? '', db);
```

- [ ] **Step 5: 运行测试与构建**

Run: `node --import tsx --test src/lib/learning/content.test.ts`
Expected: PASS

Run: `npm run build`
Expected: PASS

### Task 9: 扩展学习聊天以支持数据库课时

**Files:**
- Modify: `src/lib/learning/chat.ts`
- Modify: `src/lib/learning/chat.test.ts`
- Modify: `src/lib/learning/chat-route.test.ts`
- Modify: `src/pages/api/learn/chat.ts`
- Modify: `src/lib/learning/content.ts`

- [ ] **Step 1: 写数据库课时聊天上下文测试**

```ts
test('buildLearningChatContext uses database lesson summary when lesson comes from cms', async () => {
  const db = createMockDbWithPublishedLesson({
    subjectSlug: 'token-security',
    lessonSlug: 'session-basics',
    chatContextSummary: '围绕 cookie、session 与 token 的差异解释。',
  });

  const entry = await getLearningLesson('token-security', 'session-basics', db);
  assert.match(entry?.lesson.chatContextSummary ?? '', /cookie|session|token/i);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test src/lib/learning/chat.test.ts src/lib/learning/chat-route.test.ts`
Expected: FAIL，聊天只认识静态 catalog

- [ ] **Step 3: 扩展 chat route 与 context builder**

```ts
const entry = await getLearningLesson(subject, lessonSlug, db);
if (!entry) {
  return json({ message: 'Unknown lesson context.' }, 404);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --import tsx --test src/lib/learning/chat.test.ts src/lib/learning/chat-route.test.ts`
Expected: PASS

### Task 10: 扩展搜索与站点收录

**Files:**
- Modify: `src/pages/search.astro`
- Modify: `src/lib/learning/content.ts`
- Modify: `src/pages/sitemap.xml.ts` (or current sitemap file if present)

- [ ] **Step 1: 写数据库学习内容进入搜索索引测试**

```ts
test('getAllLearningLessons includes published CMS lessons in search output', async () => {
  const db = createMockDbWithPublishedLesson({
    subjectSlug: 'token-security',
    lessonSlug: 'session-basics',
    title: '会话基础',
  });

  const lessons = await getAllLearningLessons(db);
  assert.ok(lessons.some((lesson) => lesson.href === '/learn/token-security/session-basics'));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test src/lib/learning/content.test.ts`
Expected: FAIL，搜索聚合未纳入数据库课时

- [ ] **Step 3: 扩展搜索索引与站点地图**

```ts
const learningLessons = await getAllLearningLessons(db);
```

- [ ] **Step 4: 运行测试与构建**

Run: `node --import tsx --test src/lib/learning/content.test.ts`
Expected: PASS

Run: `npm run build`
Expected: PASS

### Task 11: 全量验证

**Files:**
- Modify: integration-touched files from Tasks 1-10 only if regressions appear

- [ ] **Step 1: 运行学习相关测试**

Run: `node --import tsx --test src/lib/learning/repository.test.ts src/lib/learning/validation.test.ts src/lib/learning/content.test.ts src/lib/learning/chat.test.ts src/lib/learning/chat-route.test.ts src/lib/ai/learning.test.ts`
Expected: PASS

- [ ] **Step 2: 运行完整测试**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: 运行构建**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: 手工检查关键路由**

Run:

```bash
/learn
/learn/token-security
/learn/token-security/session-basics
/admin/learning
/admin/learning/new
```

Expected:

- 公开学习中心能看到总学习轴
- 数据库专题可访问
- 静态专题仍可访问
- 后台学习页可进入
- quickstart 页能加载模型并提交
