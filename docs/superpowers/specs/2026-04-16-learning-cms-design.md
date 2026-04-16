# 学习 CMS 设计

**日期：** 2026-04-16
**状态：** 已按当前对话确认，可直接进入实现

## 背景

当前学习中心仍然是代码内维护：

- `/learn`
- `/learn/[subject]`
- `/learn/[subject]/[lesson]`

对应数据直接来自 `src/data/learning/*` 与 `src/lib/learning/content.ts`。这适合首批静态专题，但不适合后续持续从后台发布新专题。用户已经明确希望后续通过网页后台完成学习内容创建，并且只输入一句需求，由 AI 自动生成阶段、专题和课时草稿。

## 目标

在不破坏现有博客、小说、后台、学习页的前提下，新增一套“后台可管理的学习 CMS”，满足：

1. 学习体系有固定的总学习轴。
2. 结构固定为：总学习轴 -> 阶段 -> 专题 -> 课时。
3. 阶段固定，不允许 AI 任意改顶层结构。
4. 后续新增专题通过后台完成，不需要改代码。
5. 后台支持“一句话创建学习专题”，由 AI 自动决定阶段、专题信息、课时序列与课时草稿。
6. 现有静态学习专题继续可访问，作为兼容层保留。

## 已确认的产品决策

### 总学习轴固定

总学习轴固定为五个阶段：

- `入门`
- `基础`
- `进阶`
- `专题`
- `实战`

这五个阶段不从数据库动态生成，也不由 AI 决定。它们作为产品骨架，由代码常量维护。

### 后台创建方式

后台默认采用“只填一句需求，剩下交给 AI”的工作流。

管理员输入一条需求后，系统自动完成：

1. 归类到某个固定阶段。
2. 生成专题标题、slug、简介、学习收益。
3. 生成课时大纲与顺序。
4. 生成每节课的正文草稿、要点、误区、小测与聊天上下文。

### 渐进迁移，不强制迁移旧专题

现有 `networking`、`computer-organization`、`ai-agent-engineering`、`reverse-engineering` 继续保留为静态专题，新的 CMS 只负责后续新增的后台专题。

公开站点改为“数据库优先，静态专题兜底”的混合读取模式：

1. 如果请求命中数据库专题，则渲染数据库内容。
2. 如果没命中数据库，再退回到原有静态 catalog。

这样可以在不大迁移现有内容的情况下尽快上线后台管理能力。

## 架构设计

## 一、数据层

### 1. 固定阶段常量

新增一组学习阶段常量，例如：

- `src/data/learning/stages.ts`

这里维护：

- 阶段 slug
- 阶段标题
- 阶段说明
- 阶段排序
- 首页/后台展示文案

数据库中的专题只存 `stageSlug`，不重复存阶段定义本身。

### 2. 数据库存储模型

新增 D1 表，采用和 novels/analytics 类似的“代码内 ensure schema + migration 文件”双保险方式。

推荐最小可行模型：

#### `learning_tracks`

表示“专题”。

字段建议：

- `id`
- `slug`
- `title`
- `short_title`
- `description`
- `stage_slug`
- `eyebrow`
- `color_token`
- `icon`
- `page_variant`
- `learning_path_json`
- `concept_overview_json`
- `status`
- `source_prompt`
- `created_at`
- `updated_at`

说明：

- `status` 至少支持 `draft` / `published`
- `learning_path_json` 存专题的 3 条摘要路径文案
- `concept_overview_json` 存顶部概念总览
- `source_prompt` 保存管理员的一句话需求，便于后续追溯

#### `learning_lessons`

表示“课时”。

字段建议：

- `id`
- `track_id`
- `lesson_slug`
- `title`
- `description`
- `order_index`
- `estimated_minutes`
- `objectives_json`
- `keywords_json`
- `chat_context_summary`
- `related_lesson_slugs_json`
- `animation_kind`
- `hero_summary`
- `sections_json`
- `misconceptions_json`
- `quiz_json`
- `quick_prompts_json`
- `status`
- `created_at`
- `updated_at`

说明：

- 为了快速落地，课时详细结构先使用 JSON 字段保存，而不是一开始拆成多张 section/quiz 表
- 公开学习页和聊天接口仍然拿到与静态 `LearningLesson` 兼容的结构

### 3. Repository 与类型

新增：

- `src/lib/learning/repository.ts`
- `src/lib/learning/repository.test.ts`
- `src/lib/learning/types.ts`
- `src/lib/learning/validation.ts`
- `src/lib/learning/validation.test.ts`

这里负责：

- ensure schema
- 增删改查专题和课时
- 将数据库行映射为公开学习页可消费的对象
- 课时排序、邻接导航、搜索索引拼接

## 二、公开学习页

### 1. `/learn`

学习中心首页升级为两层结构：

1. 顶部展示固定的总学习轴五阶段。
2. 每个阶段下面展示该阶段下的专题。

专题来源是“静态专题映射 + 数据库专题”合并结果。

静态专题通过代码映射到固定阶段：

- networking -> 基础
- computer-organization -> 基础
- ai-agent-engineering -> 专题
- reverse-engineering -> 专题

新的后台专题直接使用数据库 `stage_slug`。

### 2. `/learn/[subject]`

路由保持不变，但读取逻辑调整为：

1. 先查数据库专题 slug
2. 查不到则退回静态专题

数据库专题页和静态专题页尽量使用同一个模板，以统一用户体验。

### 3. `/learn/[subject]/[lesson]`

同样采用数据库优先、静态兜底模式。

数据库课时需要被映射为当前 lesson 页已使用的统一结构：

- objectives
- keywords
- heroSummary
- sections
- misconceptions
- quiz
- quickPrompts

### 4. 搜索与 sitemap

搜索页与站点地图扩展为支持数据库学习专题和课时。

静态专题继续保留在索引中，数据库专题和课时追加进去，不破坏现有搜索。

## 三、后台学习管理

新增后台产品线：

- `/admin/learning`
- `/admin/learning/new`
- `/admin/learning/[id]`
- `/admin/learning/[id]/lessons/[lessonId]`

### 1. `/admin/learning`

列表页展示：

- 专题标题
- 所属阶段
- 状态
- 课时数
- 更新时间
- 进入编辑
- 新建专题

### 2. `/admin/learning/new`

默认主入口为“一句话 AI 创建学习专题”。

页面包含：

- 一句话需求输入框
- AI 配置区：Base URL / API Key / Model
- 获取模型按钮
- 生成状态反馈区
- 生成成功后的跳转入口

这一页优先复用小说 quickstart 的交互模式，但更聚焦学习专题，而不是长篇小说。

### 3. `/admin/learning/[id]`

专题编辑页展示：

- 专题基础信息
- 所属阶段
- 标题、slug、简介、概念总览
- 发布状态
- 课时列表
- 重新生成课时按钮
- 新增课时按钮

### 4. `/admin/learning/[id]/lessons/[lessonId]`

课时编辑页支持修改：

- 标题、简介、时长
- 目标、关键词
- 正文 section
- 常见误区
- 小测
- 聊天上下文摘要
- 快捷追问
- 发布状态

## 四、AI 生成链路

新增：

- `src/lib/ai/learning.ts`
- `src/lib/ai/learning.test.ts`
- `src/pages/api/admin/learning/quickstart.ts`

### 生成步骤

一句话创建学习专题采用三段式：

#### 第一步：生成专题蓝图

根据一句话需求生成：

- 推荐阶段
- 专题标题
- slug
- 简介
- 概念总览
- learningPath

#### 第二步：生成课时大纲

生成 4 到 8 节课的序列，包括：

- lesson slug
- 标题
- 简介
- 顺序
- 预计时长
- 关键词

#### 第三步：逐课生成草稿

为每节课生成：

- objectives
- heroSummary
- sections
- misconceptions
- quiz
- quickPrompts
- chatContextSummary

### AI 配置策略

继续沿用当前后台 AI 页与小说 quickstart 的模式：

- Base URL / API Key / Model 由管理员在浏览器本地输入
- 页面通过 localStorage 暂存
- 点击“获取模型”后从服务端拉模型列表
- 生成接口请求体里显式携带这三项配置

不新增服务端永久保存密钥的逻辑，避免扩大敏感信息存储面。

## 五、兼容策略

### 静态专题继续保留

不会强制把旧专题迁到数据库。

原因：

1. 当前已存在较多静态学习专题和交互组件。
2. 本次核心目标是让“后续新增内容”改成后台管理。
3. 先做混合层可以尽快上线，风险更低。

### 公开类型兼容

数据库专题与课时最终都会被转换成当前学习页兼容的结构，因此：

- 现有学习组件可以继续复用
- 现有聊天接口逻辑可以在扩展后继续使用
- 搜索与导航逻辑可以逐步迁移，不需要推翻重写

## 六、错误处理

### 后台 AI 创建

需要明确区分：

- AI 配置缺失
- 获取模型失败
- 生成蓝图失败
- 生成课时失败
- 数据落库失败

所有失败都必须回到受控错误，不允许直接白屏。

### 公开学习页

如果数据库不可用但静态专题可用，静态专题仍然正常展示。

如果访问数据库专题但数据不完整：

- subject 不存在 -> 404
- lesson 不存在 -> 404
- 课时 JSON 结构损坏 -> 记录日志并尽量渲染最小可读正文

## 七、测试策略

至少覆盖：

1. repository schema 与 CRUD
2. validation
3. AI 生成结果解析
4. `getLearningSubjects` / `getLearningLesson` 的数据库优先与静态 fallback
5. admin quickstart API
6. 搜索索引中数据库学习内容的拼接
7. 构建通过

## 八、本次实现边界

本次只实现“学习 CMS 一期”，不做以下内容：

- 服务端持久化保存管理员 AI 密钥
- 后台富文本编辑器重型改造
- 静态专题批量迁移到数据库
- 学习内容版本历史
- 复杂异步任务队列

## 结论

本次采用“固定总学习轴 + 数据库专题/课时 + 静态专题兼容层 + 后台一句话 AI 创建”的方案。

这是当前仓库里最稳妥、最能快速交付、也最符合用户后续持续扩展诉求的方向：

1. 不破坏现有学习中心。
2. 后续新增内容不再需要改代码。
3. AI 可以承担绝大部分学习专题生成工作。
4. 总学习轴仍然保持产品级可控，不会被 AI 带偏。
