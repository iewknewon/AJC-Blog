# AI / Agent 工程基础学习专题设计文档

**日期：** 2026-04-16  
**主题：** 在公开学习中心中新增一条 AI / Agent 工程基础专题线

## 一、目标

在现有学习中心里新增第三条专题线，系统覆盖当前最常见、最热门的一批 AI / Agent 工程概念，避免这些内容继续以零散博客的方式分散出现。

这一专题的目标不是只给定义，而是同时回答四件事：

- 这个词是什么意思
- 它和相邻概念是什么关系
- 它在真实 AI 系统里位于哪一层
- 最常见的误区是什么

新增专题后，学习中心应从“计算机基础课”扩展成“计算机基础 + AI 工程基础”的双层产品，而不是临时堆几篇热点文章。

## 二、当前项目上下文

当前项目已经具备一套可复用的学习中心框架：

- `/learn` 学习中心首页
- `/learn/[subject]` 课程总览页
- `/learn/[subject]/[lesson]` 课时页
- 代码内维护的课程目录 `src/data/learning/catalog.ts`
- 课时结构化数据类型 `src/data/learning/types.ts`
- 课时动画 / 图解组件
- 课内追问聊天框与搜索收录

因此这次扩展应优先复用现有课程体系，而不是新开一个平行内容系统。

## 三、方案结论

采用“新增第三条学习专题线”的方案。

新增专题名称：

- `AI / Agent 工程基础`

不采用以下两个方向作为主方案：

- 不做纯术语百科
- 不做纯博客合集

原因如下：

- 术语百科查得快，但学习体验容易碎片化
- 博客合集写起来快，但会把学习内容和博客内容再次混在一起
- 学习专题线最适合当前项目已有的课程页、图解、聊天和搜索架构

## 四、内容定位

该专题面向以下两类人：

- 听过 `Agent`、`MCP`、`RAG`、`Skill`、`Tool Use` 等词，但概念彼此混在一起的用户
- 已经在用 AI 产品或开发 AI 应用，但还没有建立系统化概念地图的用户

内容风格要求：

- 中文优先
- 先讲白话结论，再讲工程定义
- 强调概念关系，而不是堆术语
- 课时内容要能被搜索命中，也要适合连着学

## 五、信息架构

学习中心从当前两条专题扩展为三条：

1. `计算机网络`
2. `计算机组成原理`
3. `AI / Agent 工程基础`

首页新增一张专题卡片，引导文案要明确说明这条线讲的是：

- Skill
- Tool
- Function Calling
- Agent
- Workflow
- Memory
- Context Window
- RAG
- MCP
- Multi-Agent
- Guardrails
- Evals / Observability

## 六、课程结构

专题采用“1 节总览课 + 多节拆解课”的结构，避免一上来就把用户丢进碎片术语海洋。

### 1. 总览课

第一课固定为：

- `一张图看懂 AI / Agent 工程全景`

这节课负责把以下概念放进同一张关系图：

- Model
- Prompt
- Tool
- Function Calling
- Skill
- Agent
- Workflow
- Memory
- Context
- Context Window
- RAG
- MCP
- Guardrails
- Evals

### 2. 第一批拆解课

第一批至少上线以下 10 节：

1. `什么是 AI Agent`
2. `Skill、Tool、Function Calling 到底是什么关系`
3. `MCP 是什么，为什么它会火`
4. `Workflow 和 Agent 有什么区别`
5. `Prompt Engineering 到底解决什么，不解决什么`
6. `Memory、Context、Context Window`
7. `RAG、知识库、检索增强`
8. `Planning、Reasoning、Execution`
9. `Multi-Agent、并发、协作`
10. `Guardrails、权限、评测、可观测性`

为了覆盖更多热门词，课时正文和关键词中还应纳入这些高频概念：

- Tool Use
- System Prompt
- User Prompt
- Structured Output
- Built-in Tools
- Web Search
- File Search
- Computer Use
- Agent Loop
- Orchestration
- Long-term Memory
- Short-term Context
- Evals
- Observability
- Retry / Fallback
- Permission Boundary

## 七、课时设计模板

每节课继续沿用当前学习课时页的结构，但内容组织更强调“概念关系”：

1. 一句超白话结论
2. 一张关系图 / 流程图 / 对照图
3. 它在真实系统中的位置
4. 常见误区
5. 一道快速测验
6. 课内追问聊天框

每节课都要明确回答：

- 它是一个概念、一个接口、一个能力，还是一个架构层
- 它和相邻概念的边界在哪
- 什么情况下应该用它
- 什么情况下不该把它神化

## 八、可视化设计

这一专题不能只靠文字解释，必须配一批直观的代码原生图解。

建议至少新增以下动画 / 图解类型：

1. `AI 工程全景地图`
   - 展示 Model -> Prompt -> Tool -> Agent -> Workflow -> Memory -> Guardrails 的关系

2. `Skill / Tool / Function Calling 分层图`
   - 用三层卡片解释“能力封装”和“模型可调用接口”之间的区别

3. `MCP 通路图`
   - 展示 Host / Client / MCP Server / Resource / Tool 的流向

4. `Workflow vs Agent 对照图`
   - 左右对比“固定流程编排”和“带决策循环的代理执行”

5. `Memory / Context 流转图`
   - 区分当前上下文、摘要记忆、长期资料库

6. `RAG 管线图`
   - Query -> Retrieval -> Rerank -> Context Assembly -> Answer

7. `Multi-Agent 协作图`
   - 一个主代理 + 多个子代理的任务切分与汇总

8. `Guardrails / Evals / Observability 防线图`
   - 展示生成前、生成中、生成后的控制点

所有图解都必须保留静态降级内容，不能因为脚本异常导致正文不可读。

## 九、数据模型影响

本专题继续采用代码内维护，不新增后台 CMS。

为支持第三条专题，需要调整当前学习类型：

- `LearningSubjectSlug` 需要扩展为包含新的专题 slug
- `LearningAnimationKind` 需要扩展以容纳 AI / Agent 相关新图解
- `learningCatalog` 需要新增一个完整 subject

建议专题 slug：

- `ai-agent-engineering`

该专题课时仍使用现有数据结构：

- `subject`
- `lessonSlug`
- `title`
- `description`
- `objectives`
- `keywords`
- `chatContextSummary`
- `relatedLessonSlugs`
- `animation`
- `heroSummary`
- `sections`
- `misconceptions`
- `quiz`
- `quickPrompts`

## 十、搜索与导航

该专题必须完整接入现有搜索体系。

要求如下：

- `/search` 能搜到 `agent`、`mcp`、`skill`、`workflow`、`rag` 等关键词
- 中英文常见写法都应在 `keywords` 和 `plainText` 可命中
- 首页学习中心区块应出现该专题卡片
- 学习中心首页按钮文案不再只围绕网络和组成原理，需要增加 AI 工程入口

## 十一、课内问答范围

课内聊天仍维持“绑定当前课时上下文”的原则，不做成泛化聊天机器人。

对于这一专题，聊天框应特别强化以下能力：

- 解释概念之间的区别
- 给出现实产品或工程类比
- 回答“这个词属于哪一层”
- 把复杂定义翻译成更白话的表述

推荐追问按钮可增加：

- `把这几个词放到一张图里`
- `举一个真实开发场景`
- `它和上一课有什么区别`
- `再简单一点`
- `给我一道判断题`

## 十二、边界与不做

这次新增专题不做以下内容：

- 不做实时抓取的“AI 热点新闻课”
- 不做厂商产品评测榜单
- 不做需要频繁联网更新的术语时间线
- 不做开放式全站 AI 导师

这样可以避免学习内容很快失效，也能保持课时质量稳定。

## 十三、实施顺序建议

建议按以下顺序实现：

1. 扩展学习数据类型与目录，允许第三专题存在
2. 完成专题卡片和课程总览页接入
3. 先上线总览课 + 3 节最核心课
   - AI Agent
   - Skill / Tool / Function Calling
   - MCP
4. 再补其余 7 节拆解课
5. 最后补齐专属图解、搜索关键词和课内问答优化

这样能更快形成一个可上线的专题雏形，而不是等全部 10 节写完才可见。

## 十四、验收标准

基础验收：

- `/learn` 出现第三条专题卡片
- `/learn/ai-agent-engineering` 可以正常访问
- 课时页、上一课 / 下一课导航正常
- 搜索页可搜到核心 AI 工程术语

内容验收：

- 第一批至少 10 节课，覆盖当前主流 AI / Agent 工程词汇
- 每节课都有清晰的误区说明，而不是只有定义
- 每节课都有互动图解或静态替代说明
- 课内聊天能围绕当前课时解释概念边界

体验验收：

- 桌面端和移动端都可读
- 页面视觉层级清晰，不像单纯堆积名词
- 用户从总览课进入后，能逐步建立完整概念图

## 十五、最终结论

这次不应把热门 AI 概念拆成零散博客，而应把它们沉淀为学习中心里的第三条正式专题线。

最终落地方向是：

- 新增 `AI / Agent 工程基础` 专题
- 先总览，后拆解
- 以关系图、流程图、对照图解释概念
- 覆盖当前主流高频术语
- 保持与现有学习中心、搜索和课内问答体系一致

这样做既能满足“多写一些热门教程”的需求，也能让这个博客网站更像一个长期可扩展的知识型产品，而不是短期热点文章集合。
