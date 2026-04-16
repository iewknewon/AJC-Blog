# AI / Agent 工程基础专题实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有学习中心中新增 `AI / Agent 工程基础` 第三专题，覆盖热门 AI 工程概念，并接入现有课时页、图解、搜索和课内问答体系。

**Architecture:** 继续复用当前学习中心的数据驱动架构，在 `learningCatalog` 中新增第三个 subject，并通过新增一组 AI/Agent 专题图解组件接入既有的 `/learn`、`/learn/[subject]`、`/learn/[subject]/[lesson]` 页面。主线程负责类型、路由接线和最终联调；并行 worker 负责内容、图解和入口展示。

**Tech Stack:** Astro, TypeScript, node:test, 代码内课程数据, 代码原生交互图解

---

### Task 1: 扩展学习数据模型并写入 AI / Agent 专题内容

**Files:**
- Modify: `src/data/learning/types.ts`
- Modify: `src/data/learning/catalog.ts`
- Test: `src/lib/learning/content.test.ts`

- [ ] **Step 1: 先写失败测试，锁定第三专题和关键词可检索行为**

```ts
test('getLearningSubjects includes the AI / Agent engineering track', () => {
  const subjects = getLearningSubjects();

  assert.equal(subjects.length, 3);
  assert.deepEqual(
    subjects.map((subject) => subject.slug),
    ['networking', 'computer-organization', 'ai-agent-engineering'],
  );
});

test('getAllLearningLessons exposes AI / Agent lesson metadata for search', () => {
  const lessons = getAllLearningLessons();
  const lesson = lessons.find((item) => item.lessonSlug === 'what-is-an-agent');

  assert.ok(lesson);
  assert.equal(lesson?.subjectTitle, 'AI / Agent 工程基础');
  assert.match(lesson?.plainText ?? '', /MCP|Tool|Agent/);
});
```

- [ ] **Step 2: 运行测试，确认当前为失败状态**

Run: `node --import tsx --test src/lib/learning/content.test.ts`  
Expected: FAIL，原因是当前只有 2 个专题，且不存在 `ai-agent-engineering` 课时。

- [ ] **Step 3: 扩展类型，允许第三专题和新的动画类型**

```ts
export type LearningSubjectSlug =
  | 'networking'
  | 'computer-organization'
  | 'ai-agent-engineering';

export type LearningAnimationKind =
  | 'protocol-stack'
  | 'http-lifecycle'
  | 'tcp-flow'
  | 'system-architecture'
  | 'instruction-cycle'
  | 'cache-locality'
  | 'ai-agent-landscape'
  | 'skill-tool-function'
  | 'mcp-flow'
  | 'workflow-vs-agent'
  | 'memory-context'
  | 'rag-pipeline'
  | 'guardrails-observability';
```

- [ ] **Step 4: 在 `learningCatalog` 中新增完整专题和至少 10 节课**

```ts
{
  slug: 'ai-agent-engineering',
  title: 'AI / Agent 工程基础',
  shortTitle: 'AI 工程',
  description: '把 Agent、Skill、Tool、MCP、RAG、Memory、Workflow 等热门概念放回同一张工程地图里，讲清它们的边界、关系和真实用法。',
  eyebrow: 'Learning Track',
  colorToken: 'ai-agent',
  icon: 'AG',
  learningPath: [
    '先用一张图建立 AI / Agent 工程全景地图',
    '再逐个拆开 Agent、Tool、Skill、MCP、RAG 等关键概念',
    '最后建立多代理协作、记忆、评测与防护的系统视角',
  ],
  lessons: [
    // 至少 10 节课，包含 what-is-an-agent / mcp-explained / workflow-vs-agent 等
  ],
}
```

- [ ] **Step 5: 每节课填充完整结构化内容**

```ts
{
  subject: 'ai-agent-engineering',
  lessonSlug: 'what-is-an-agent',
  title: '什么是 AI Agent',
  description: '把“会调用工具的大模型”和“真正的代理系统”分开看，建立 Agent 的最小定义。',
  order: 2,
  estimatedMinutes: 12,
  objectives: [
    '区分模型、工具调用和代理执行循环',
    '理解 Agent 至少需要目标、状态、决策与执行',
    '知道为什么不是所有聊天机器人都算 Agent',
  ],
  keywords: ['AI Agent', 'Agent', 'Tool Use', 'Decision Loop', 'Workflow'],
  chatContextSummary: '本课聚焦 AI Agent 的最小定义、执行循环、与普通工作流和工具调用的边界。',
  relatedLessonSlugs: ['agent-landscape', 'workflow-vs-agent'],
  animation: 'ai-agent-landscape',
  heroSummary: 'Agent 不是“会聊天的模型”，而是“能围绕目标持续决定下一步动作的系统”。',
  sections: [...],
  misconceptions: [...],
  quiz: [...],
  quickPrompts: [...],
}
```

- [ ] **Step 6: 重新运行测试，确认新专题数据已可检索**

Run: `node --import tsx --test src/lib/learning/content.test.ts`  
Expected: PASS

- [ ] **Step 7: 提交本任务**

```bash
git add src/data/learning/types.ts src/data/learning/catalog.ts src/lib/learning/content.test.ts
git commit -m "feat: add ai agent learning catalog"
```

### Task 2: 新增第一组 AI / Agent 专题图解组件

**Files:**
- Create: `src/components/learning/AiAgentLandscape.astro`
- Create: `src/components/learning/SkillToolFunctionMap.astro`
- Create: `src/components/learning/McpFlowExplorer.astro`

- [ ] **Step 1: 为总览课和前 3 节核心课写失败用例说明**

```md
需要新增 3 个组件，均必须：
- 使用代码原生实现，不引入外部媒体
- 自带静态说明文案
- 在无交互时仍能独立阅读
- 组件内部可自包含脚本和样式
```

- [ ] **Step 2: 实现 `AiAgentLandscape.astro`**

```astro
<div class="content-card learning-visual-card ai-agent-landscape" data-learning-visual="ai-agent-landscape">
  <div class="learning-visual-header">
    <span class="tag">概念全景</span>
    <h3>从模型到代理系统的全链路</h3>
    <p>点击每一层，理解 Prompt、Tool、Memory、Workflow、Guardrails 在系统里分别负责什么。</p>
  </div>
  <!-- 概念层级图 -->
</div>

<script>
  // 切换高亮和解释面板
</script>
```

- [ ] **Step 3: 实现 `SkillToolFunctionMap.astro`**

```astro
<div class="content-card learning-visual-card skill-tool-function-map" data-learning-visual="skill-tool-function">
  <!-- Skill -> Tool -> Function Calling 三层对照 -->
</div>
```

- [ ] **Step 4: 实现 `McpFlowExplorer.astro`**

```astro
<div class="content-card learning-visual-card mcp-flow-explorer" data-learning-visual="mcp-flow">
  <!-- Host / Client / MCP Server / Resource / Tool 流程图 -->
</div>
```

- [ ] **Step 5: 本地构建这些组件的静态降级检查**

Run: `npm run build`  
Expected: PASS，组件在服务端渲染阶段无脚本错误。

- [ ] **Step 6: 提交本任务**

```bash
git add src/components/learning/AiAgentLandscape.astro src/components/learning/SkillToolFunctionMap.astro src/components/learning/McpFlowExplorer.astro
git commit -m "feat: add core ai agent learning visuals"
```

### Task 3: 新增第二组 AI / Agent 专题图解组件

**Files:**
- Create: `src/components/learning/WorkflowAgentComparator.astro`
- Create: `src/components/learning/MemoryContextExplorer.astro`
- Create: `src/components/learning/RagPipelineExplorer.astro`
- Create: `src/components/learning/GuardrailsObservabilityBoard.astro`

- [ ] **Step 1: 实现 `WorkflowAgentComparator.astro`**

```astro
<div class="content-card learning-visual-card workflow-agent-comparator" data-learning-visual="workflow-vs-agent">
  <!-- 左右对照：固定编排 vs 带决策循环 -->
</div>
```

- [ ] **Step 2: 实现 `MemoryContextExplorer.astro`**

```astro
<div class="content-card learning-visual-card memory-context-explorer" data-learning-visual="memory-context">
  <!-- 当前上下文 / 摘要记忆 / 长期资料 三层流转 -->
</div>
```

- [ ] **Step 3: 实现 `RagPipelineExplorer.astro`**

```astro
<div class="content-card learning-visual-card rag-pipeline-explorer" data-learning-visual="rag-pipeline">
  <!-- Query -> Retrieval -> Rerank -> Context Assembly -> Answer -->
</div>
```

- [ ] **Step 4: 实现 `GuardrailsObservabilityBoard.astro`**

```astro
<div class="content-card learning-visual-card guardrails-observability-board" data-learning-visual="guardrails-observability">
  <!-- 生成前 / 生成中 / 生成后 的防护与观测点 -->
</div>
```

- [ ] **Step 5: 构建验证**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 6: 提交本任务**

```bash
git add src/components/learning/WorkflowAgentComparator.astro src/components/learning/MemoryContextExplorer.astro src/components/learning/RagPipelineExplorer.astro src/components/learning/GuardrailsObservabilityBoard.astro
git commit -m "feat: add advanced ai agent learning visuals"
```

### Task 4: 更新学习中心入口和专题展示

**Files:**
- Modify: `src/pages/learn/index.astro`
- Modify: `src/components/learning/LearningSubjectCard.astro`
- Modify: `src/pages/learn/[subject].astro`
- Modify: `src/styles/global.css`

- [ ] **Step 1: 先写出展示目标**

```md
首页和课程总览页必须让第三专题看起来是正式产品线，而不是后来补上的卡片。
```

- [ ] **Step 2: 更新学习中心首页文案和 CTA**

```astro
<BaseLayout
  title={`学习中心 | ${siteConfig.title}`}
  description="用更通俗、更可视化的方式学习计算机网络、计算机组成原理和 AI / Agent 工程基础。"
  pathname="/learn"
>
```

```astro
actions={[
  { href: '/learn/ai-agent-engineering', label: '看 AI 工程', primary: true },
  { href: '/learn/networking', label: '从网络开始' },
  { href: '/learn/computer-organization', label: '看组成原理' },
]}
```

- [ ] **Step 3: 扩展专题卡片样式，让 AI 专题有独立视觉识别**

```css
.learning-subject-card.is-ai-agent::after {
  background: linear-gradient(135deg, rgba(28, 181, 224, 0.2), rgba(0, 87, 217, 0.42));
}

.learning-subject-card.is-ai-agent .learning-subject-icon {
  background: linear-gradient(135deg, #0d9488, #2563eb);
}
```

- [ ] **Step 4: 优化 `/learn/[subject]` 的学习路径文案承载**

```astro
{ label: '学习方式', value: '图解 + 互动 + 追问' }
```

并确保 AI 专题的 10 节课按顺序渲染。

- [ ] **Step 5: 构建验证**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 6: 提交本任务**

```bash
git add src/pages/learn/index.astro src/components/learning/LearningSubjectCard.astro src/pages/learn/[subject].astro src/styles/global.css
git commit -m "feat: add ai agent learning track entry"
```

### Task 5: 主线程整合类型、动画接线和最终验证

**Files:**
- Modify: `src/components/learning/LearningVisual.astro`
- Modify: `src/lib/learning/content.test.ts`
- Modify: any merged files from Task 1-4 if integration conflicts appear

- [ ] **Step 1: 把新增动画种类接入统一的 `LearningVisual` 组件**

```astro
{kind === 'ai-agent-landscape' ? <AiAgentLandscape /> : null}
{kind === 'skill-tool-function' ? <SkillToolFunctionMap /> : null}
{kind === 'mcp-flow' ? <McpFlowExplorer /> : null}
{kind === 'workflow-vs-agent' ? <WorkflowAgentComparator /> : null}
{kind === 'memory-context' ? <MemoryContextExplorer /> : null}
{kind === 'rag-pipeline' ? <RagPipelineExplorer /> : null}
{kind === 'guardrails-observability' ? <GuardrailsObservabilityBoard /> : null}
```

- [ ] **Step 2: 运行学习内容测试**

Run: `node --import tsx --test src/lib/learning/content.test.ts`  
Expected: PASS

- [ ] **Step 3: 运行全量测试**

Run: `npm test`  
Expected: PASS

- [ ] **Step 4: 运行生产构建**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 5: 提交整合结果**

```bash
git add src/components/learning/LearningVisual.astro src/lib/learning/content.test.ts
git commit -m "feat: launch ai agent learning track"
```
