import type { LearningSubject } from './types';

export const reverseEngineeringSubject: LearningSubject = {
  slug: 'reverse-engineering',
  title: '逆向专题',
  shortTitle: '逆向',
  description: '面向零基础的通用二进制与 Windows PE 入门线，先建立观察框架，再学习如何用静态分析、动态调试和函数追踪读懂程序。',
  eyebrow: 'Learning Track',
  colorToken: 'reverse',
  icon: 'REV',
  pageVariant: 'timeline',
  conceptOverview: {
    title: '逆向是什么',
    summary: '逆向不是“神秘地破解一切”，而是带着问题观察程序如何组织、如何运行、为什么会这样决策。入门阶段最重要的是建立“文件结构、执行过程、内存变化、函数调用”这四张地图，再学会在静态分析和动态调试之间来回切换。',
    pillars: [
      '先从程序整体结构入手，再下钻到单条指令和单个函数。',
      '静态分析回答“还没跑起来时我能看出什么”，动态调试回答“跑起来以后它到底做了什么”。',
      '工具只是放大镜，真正要练的是观察路径、验证假设和整理证据的能力。',
    ],
    safetyNotes: [
      '只在你有权分析的样本、练习程序或教学案例上学习。',
      '一期内容聚焦原理与观察方法，不涉及漏洞利用、脱壳对抗或攻击性操作。',
    ],
  },
  learningPath: [
    '先看懂程序文件、PE 结构和加载时会发生什么。',
    '再学会用寄存器、断点、调用栈和内存视角跟踪执行过程。',
    '最后把静态分析与动态调试串起来，独立定位一个小程序里的关键逻辑。',
  ],
  lessons: [
    {
      subject: 'reverse-engineering',
      lessonSlug: 'program-binary-pe',
      title: '程序、二进制与 PE 是什么',
      description: '建立“程序文件长什么样、装进内存前后发生什么”的第一张地图。',
      order: 1,
      estimatedMinutes: 14,
      objectives: [
        '理解源代码、可执行文件、进程与内存映像之间的关系。',
        '知道 Windows PE 文件里最值得先看的区域：Header、Section、Import。',
        '能用“装箱清单”的比喻解释为什么静态分析从文件结构开始。',
      ],
      keywords: ['逆向', 'Binary', 'PE', 'Section', 'Import', 'Loader'],
      chatContextSummary: '本课聚焦程序从磁盘文件到进程映像的转变过程，重点解释二进制文件、Windows PE 结构、Section、Import 和 Loader 的职责边界。',
      relatedLessonSlugs: ['static-analysis-first-look', 'dynamic-debugging-basics'],
      animation: 'reverse-landscape',
      heroSummary: '把程序当成一个“带说明书的压缩包”来看：静态时先看它如何组织，运行时再看它如何展开。',
      sections: [
        {
          title: '程序不是一团黑盒，而是一份被组织过的文件',
          paragraphs: [
            '在写代码时，我们面对的是源文件和语义；在运行程序时，系统面对的是机器能直接理解的二进制格式。逆向的第一步，就是接受“同一个程序会以不同形态出现”这件事。',
            '对于 Windows 可执行文件来说，PE 格式像一张装箱清单：它告诉系统入口点可能在哪、有哪些区段、需要导入哪些外部函数，以及装载时要按什么方式摆放到内存里。',
          ],
        },
        {
          title: '为什么入门要先看 Header、Section 和 Import',
          paragraphs: [
            'Header 像封面和目录，先告诉你“这是什么文件”；Section 像不同功能的抽屉，代码、只读数据、字符串往往被分放在不同区域；Import 则像程序向外部世界借用能力的名单。',
            '如果你还没运行程序，就已经能从这些区域推断出“它依赖什么、入口可能在哪、有哪些明显线索”，后面的调试就会更有方向，而不是盲目乱点。',
          ],
        },
        {
          title: '静态文件和运行中的进程是两张图',
          paragraphs: [
            '磁盘上的 PE 文件是静态布局，真正运行后，Loader 会把它映射到内存，修正地址、准备导入表，再把控制权交给入口点。也就是说，文件视角和进程视角既相关，又不能直接画等号。',
            '这一课的目标不是死记字段名，而是建立一个习惯：每次拿到样本时，先问自己“这份文件如何组织，运行后会变成什么样”。',
          ],
        },
      ],
      misconceptions: [
        {
          myth: '逆向就是一上来直接看汇编。',
          clarification: '如果没有文件结构和运行流程的整体地图，直接看指令很容易像拿着放大镜盯一粒沙子，却不知道自己站在沙漠的哪一块。',
        },
        {
          myth: 'PE 结构只是死板格式，和真正分析没关系。',
          clarification: '恰恰相反，PE 结构决定了你如何快速定位代码区、导入函数和资源区域，它是后续静态与动态分析的入口。',
        },
      ],
      quiz: [
        {
          question: '入门时最适合作为 PE 文件“第一眼线索”的信息是什么？',
          options: ['随便找一串字符串就开始猜功能', '先看 Header、Section 和 Import 的组织方式', '直接跳进最深的调用栈', '先修改文件再说'],
          answerIndex: 1,
          explanation: '因为这三块信息最能帮你建立“文件如何组织、可能依赖什么、后续从哪下手”的整体判断。',
        },
      ],
      quickPrompts: ['PE 和进程映像是什么关系', 'Import 为什么重要', '能不能用生活例子解释 Loader'],
    },
    {
      subject: 'reverse-engineering',
      lessonSlug: 'registers-instructions-assembly',
      title: '寄存器、指令与汇编阅读入门',
      description: '看懂最小执行单位：一条指令改了谁，寄存器为什么像“超近桌面”。',
      order: 2,
      estimatedMinutes: 15,
      objectives: [
        '理解寄存器、指令、操作数之间的基本关系。',
        '知道 mov、cmp、jmp、call、ret 这类常见指令在分析时分别意味着什么。',
        '能描述“执行前后寄存器变化”而不是只记住助记符。',
      ],
      keywords: ['寄存器', '汇编', 'Instruction', 'EAX', 'Jump', 'Call'],
      chatContextSummary: '本课面向逆向入门，解释寄存器、常见汇编指令、条件跳转和函数调用的阅读方式，重点是观察状态变化而不是死记语法。',
      relatedLessonSlugs: ['dynamic-debugging-basics', 'functions-memory-tracing'],
      animation: 'register-flow',
      heroSummary: '读汇编时不要只盯文字，要盯“执行前后谁变了、为什么变”。',
      sections: [
        {
          title: '寄存器像程序员看不见的超近桌面',
          paragraphs: [
            'CPU 在执行时不会每一步都去主内存慢慢翻资料，很多马上要用的值会先放在寄存器里。你可以把它理解成离手最近的便签区，容量不大，但速度极快。',
            '所以逆向时看到寄存器，不是背缩写本身，而是问：这个值为什么刚被放进来？它接下来要被比较、传参还是作为地址使用？',
          ],
        },
        {
          title: '常见指令是在改变状态，不是在背单词',
          paragraphs: [
            'mov 往往意味着“搬值”；cmp 常出现在“准备做判断”之前；jmp 决定路径分叉；call 和 ret 则是“进入函数 / 返回现场”的基本节奏。',
            '真正有用的阅读方式是把一小段代码看成状态流：某个值被加载、被比较、触发跳转，然后走向不同分支。',
          ],
        },
        {
          title: '为什么条件跳转是逻辑线索',
          paragraphs: [
            '程序里很多“是否登录成功”“是否满足条件”“是否进入下一步”最终都会落到比较和跳转上。也就是说，判断逻辑常常藏在 cmp + jump 这一类组合附近。',
            '当你能把“比较了什么、为什么跳、跳过去意味着什么”讲清楚时，你就开始真正进入逆向阅读状态了。',
          ],
        },
      ],
      misconceptions: [
        {
          myth: '学汇编就是把所有指令背下来。',
          clarification: '入门更重要的是理解执行模式和状态变化。常见指令先够用，再在实际案例里逐步扩展。',
        },
        {
          myth: '寄存器只是一些固定名字，没有分析价值。',
          clarification: '寄存器里的值往往正是程序当前最关注的内容，盯住它们，才能看清路径和关键判断。',
        },
      ],
      quiz: [
        {
          question: '在逆向阅读中，哪类组合最常直接暴露“条件判断将走向哪里”？',
          options: ['mov + mov', 'cmp + 条件跳转', 'push + pop', 'nop + nop'],
          answerIndex: 1,
          explanation: '因为比较和条件跳转直接决定了后续执行路径，是逻辑分叉的核心线索。',
        },
      ],
      quickPrompts: ['寄存器为什么比内存快', 'call 和 jmp 有什么差别', '怎么读懂 cmp 之后的跳转'],
    },
    {
      subject: 'reverse-engineering',
      lessonSlug: 'static-analysis-first-look',
      title: '静态分析：先不运行，怎么看程序',
      description: '不运行样本也能先搭骨架：看字符串、导入表、函数边界和资源区。',
      order: 3,
      estimatedMinutes: 15,
      objectives: [
        '掌握静态分析最常见的观察入口：字符串、导入、函数列表、资源。',
        '理解“先提出假设，再找证据”的静态分析节奏。',
        '能解释静态分析适合回答什么问题，不适合回答什么问题。',
      ],
      keywords: ['静态分析', 'Strings', 'Imports', 'Function', 'Resource', 'Cross Reference'],
      chatContextSummary: '本课解释静态分析的基本入口，包括字符串、导入函数、函数边界、资源信息和交叉引用，强调先建立假设再验证。',
      relatedLessonSlugs: ['program-binary-pe', 'dynamic-debugging-basics'],
      animation: 'pe-anatomy',
      heroSummary: '静态分析的价值，不在于“一眼看穿全部”，而在于先把可疑区域缩小到值得调试的几块。',
      sections: [
        {
          title: '为什么先不运行也有价值',
          paragraphs: [
            '有时候你只是想先了解程序大概做什么、用了哪些库、可能有哪些窗口和提示语，这些并不需要立刻运行样本。静态分析可以先让你收集全局线索。',
            '例如，一串明显的错误提示、一个网络请求相关导入、一个资源里的图标或配置，都可能帮你迅速判断程序大致的职责范围。',
          ],
        },
        {
          title: '字符串、导入表和函数列表是三把入门钥匙',
          paragraphs: [
            '字符串经常直接暴露界面文案、日志或关键提示；导入表告诉你程序借用了哪些系统能力；函数列表则帮你看到大体的结构和调用层次。',
            '这三类入口配合起来，就像先在地图上圈出商圈、交通枢纽和重点建筑，再决定下一步要去哪一块实地查看。',
          ],
        },
        {
          title: '静态分析的边界也要清楚',
          paragraphs: [
            '如果程序有大量运行期解密、动态加载、分支依赖输入，单靠静态看可能只能猜到一半。这个时候你要把静态分析当成“缩小搜索范围”的工具，而不是终点。',
            '最好养成记录假设的习惯：我怀疑这里在做校验，我怀疑这块会弹窗，我怀疑这个导入意味着文件操作。后面进入动态调试时，才能一条条验证。',
          ],
        },
      ],
      misconceptions: [
        {
          myth: '静态分析只能看见无用表面，真正有用的都要靠调试。',
          clarification: '静态分析最擅长建立整体结构和候选区域，它能让你的动态调试少走很多弯路。',
        },
        {
          myth: '看到字符串就等于知道逻辑。',
          clarification: '字符串只是线索，不是结论。关键在于把字符串和交叉引用、函数调用位置结合起来。',
        },
      ],
      quiz: [
        {
          question: '下面哪种说法最符合静态分析的作用？',
          options: ['完全替代动态调试', '先收集结构线索并缩小重点范围', '只用于美化界面', '只要看字符串就能得出结论'],
          answerIndex: 1,
          explanation: '静态分析最稳定的价值是快速建立结构感与假设，而不是在所有情况下一次性得出完整结论。',
        },
      ],
      quickPrompts: ['静态分析先看哪三样', '字符串和导入表怎么配合', '什么时候必须转入动态调试'],
    },
    {
      subject: 'reverse-engineering',
      lessonSlug: 'dynamic-debugging-basics',
      title: '动态调试：断点、单步、调用栈',
      description: '让程序跑起来，再通过断点和调用栈确认“它此刻到底在做什么”。',
      order: 4,
      estimatedMinutes: 16,
      objectives: [
        '理解断点、单步、继续运行、调用栈的基本职责。',
        '知道什么时候该看当前寄存器，什么时候该退回调用栈看上层函数。',
        '能用动态调试验证前面静态分析提出的假设。',
      ],
      keywords: ['动态调试', 'Breakpoint', 'Step Into', 'Call Stack', 'Register', 'Trace'],
      chatContextSummary: '本课聚焦动态调试入门，讲解断点、单步、继续运行、调用栈和寄存器观察如何配合使用，用于验证静态分析阶段提出的假设。',
      relatedLessonSlugs: ['static-analysis-first-look', 'functions-memory-tracing'],
      animation: 'debugger-flow',
      heroSummary: '调试器的价值不是“把程序卡住”，而是把原本一闪而过的执行过程按帧摊开。',
      sections: [
        {
          title: '断点是把高速流程按下暂停键',
          paragraphs: [
            '程序运行太快，很多关键时刻一瞬间就过去了。断点的作用，就是把你怀疑的重要节点停下来，让你有机会观察寄存器、参数和当前路径。',
            '好的断点不是乱下，而是围绕假设去下：例如你怀疑某个按钮触发校验，那就找这个动作附近的函数或比较逻辑。',
          ],
        },
        {
          title: '单步与继续运行解决的是不同问题',
          paragraphs: [
            '单步适合你想看“下一步具体怎么变”，继续运行适合你已经确认当前位置没问题，想赶紧去下一个关键点。两者交替使用，效率才高。',
            '如果一味单步，容易被细节淹没；如果一直放行，又会错过关键变化。逆向里常见的节奏是：断点停住、看上下文、短距离单步、再放行。',
          ],
        },
        {
          title: '调用栈让你知道自己身在何处',
          paragraphs: [
            '只盯当前指令，很容易不知道“我是从哪进来的”。调用栈像一条最近路径记录，告诉你当前函数是谁调用的、上层流程正在做什么。',
            '当你在一个很底层的 API 周围迷路时，往调用栈上翻几层，往往就能回到更有业务意义的位置。',
          ],
        },
      ],
      misconceptions: [
        {
          myth: '调试器最重要的是会不会把程序跑起来。',
          clarification: '真正重要的是你是否知道为什么在这里停、要观察什么、下一步为什么继续或单步。',
        },
        {
          myth: '调用栈只是高级功能，初学者可以不看。',
          clarification: '恰恰相反，调用栈能帮初学者迅速找回上下文，是避免在底层细节里迷路的关键工具。',
        },
      ],
      quiz: [
        {
          question: '当你已经停在一个底层 API 附近，却不知道它为何被调用，最值得先看什么？',
          options: ['屏幕亮度', '调用栈', '窗口颜色', '重新下载工具'],
          answerIndex: 1,
          explanation: '调用栈能快速回答“我是从哪来的”，帮你把局部指令放回上层流程里理解。',
        },
      ],
      quickPrompts: ['断点和单步怎么配合', '调用栈为什么重要', '动态调试如何验证静态猜想'],
    },
    {
      subject: 'reverse-engineering',
      lessonSlug: 'functions-memory-tracing',
      title: '函数、参数、内存与程序行为追踪',
      description: '从“函数收了什么参数、改了哪块内存”去追踪程序真实行为。',
      order: 5,
      estimatedMinutes: 16,
      objectives: [
        '理解函数调用、参数传递和返回值在分析中的意义。',
        '知道栈帧、局部变量和内存观察之间的关系。',
        '能描述一段逻辑如何通过参数和内存变化串起来。',
      ],
      keywords: ['Function', 'Parameter', 'Stack Frame', 'Memory', 'Local Variable', 'Return Value'],
      chatContextSummary: '本课围绕函数、参数、栈帧和内存追踪展开，重点解释如何把单点指令观察串成完整行为路径。',
      relatedLessonSlugs: ['registers-instructions-assembly', 'reverse-case-study'],
      animation: 'memory-stack-frame',
      heroSummary: '很多“程序在干什么”的答案，不在界面上，而在函数参数和内存变化里。',
      sections: [
        {
          title: '函数是行为的天然切片',
          paragraphs: [
            '和一长串无边界的指令相比，函数天然提供了“这块在做一件相对独立的事”的分组方式。逆向时一旦识别出函数边界，理解成本会立刻下降。',
            '你可以先问三个问题：它接收了什么？它内部改了什么？它返回了什么？很多逻辑都能顺着这三问展开。',
          ],
        },
        {
          title: '参数和栈帧告诉你数据是怎么流动的',
          paragraphs: [
            '参数决定函数带着什么上下文进来，栈帧则像这次调用临时搭起的小工作台：局部变量、保存的返回地址、临时值都会在这里留下痕迹。',
            '所以当你观察函数时，不要只看指令本身，还要看“谁把什么值送进来，这些值后来又落到了哪里”。',
          ],
        },
        {
          title: '内存观察能把抽象逻辑落成证据',
          paragraphs: [
            '有时候你怀疑一段函数修改了字符串、标志位或对象状态，最直接的办法不是靠猜，而是前后观察相应地址的内容变化。',
            '一旦把参数、栈帧和内存变化连起来，你就不只是“看懂了一小段汇编”，而是能说清程序行为如何被一步步推动。',
          ],
        },
      ],
      misconceptions: [
        {
          myth: '只要知道函数名就算分析完成。',
          clarification: '函数名只是标签，真正重要的是参数、内部状态变化和返回结果如何构成行为链。',
        },
        {
          myth: '内存观察太底层，对入门没有帮助。',
          clarification: '恰恰是内存变化让你把抽象逻辑变成可验证证据，是逆向里非常朴素也非常有力的方法。',
        },
      ],
      quiz: [
        {
          question: '想判断一个函数是否真的修改了某段关键数据，最稳妥的入门方法是什么？',
          options: ['猜测作者意图', '前后观察相关内存内容变化', '只看按钮颜色', '跳过不看'],
          answerIndex: 1,
          explanation: '观察内存前后变化，能把“我怀疑它改了”变成“我看见它真的改了”。',
        },
      ],
      quickPrompts: ['栈帧可以怎么理解', '怎么判断参数是谁传进来的', '内存变化为什么是证据'],
    },
    {
      subject: 'reverse-engineering',
      lessonSlug: 'reverse-case-study',
      title: '基础逆向案例：从一个小程序定位关键逻辑',
      description: '把前五课串起来，完整走一遍“先猜、再证、最后定位关键逻辑”的闭环。',
      order: 6,
      estimatedMinutes: 18,
      objectives: [
        '用一套固定顺序完成小程序逆向：静态看结构、动态停关键点、追踪函数与内存。',
        '理解“证据链”比“灵光一现”更重要。',
        '能复述一个入门级逆向案例的完整推理路径。',
      ],
      keywords: ['Case Study', 'Static Analysis', 'Dynamic Debugging', 'Function Trace', 'Validation', 'Evidence'],
      chatContextSummary: '本课通过一个教学用小程序案例，把静态分析、动态调试、函数追踪和内存观察连成完整闭环，强调证据链和推理路径。',
      relatedLessonSlugs: ['dynamic-debugging-basics', 'functions-memory-tracing'],
      animation: 'reverse-case-trace',
      heroSummary: '逆向案例真正要练的不是“猜中答案”，而是把每一步判断都落到能复述的证据上。',
      sections: [
        {
          title: '先搭总图，再选突破口',
          paragraphs: [
            '拿到一个小程序时，先别急着逐指令深挖。先看文件结构、字符串、导入和可能的入口流程，形成最初的功能假设。',
            '案例里我们通常会选一个最明显的交互动作当突破口，例如点击按钮、输入校验或状态切换，因为这些点最容易在静态和动态之间建立对应。',
          ],
        },
        {
          title: '用调试把假设变成证据',
          paragraphs: [
            '确定候选函数后，下断点、触发动作、看调用栈、看比较与跳转、看参数和返回值。你会逐渐把“我觉得这里像校验”变成“我看到这里真的决定了成败”。',
            '如果中途发现证据不支持原假设，也不要紧。一个好的逆向流程，本来就允许你不断修正路径，而不是硬把想法往代码上套。',
          ],
        },
        {
          title: '把案例复盘成一条能复述的逻辑链',
          paragraphs: [
            '最后要试着用自己的话说出来：我先从哪里看到线索，为什么把怀疑点缩小到这里，运行时看到了什么变化，最终怎样确认这是关键逻辑。',
            '当你能把这条链讲清楚时，你就拥有了可以迁移到下一份样本上的方法，而不是只会处理眼前这一个小案例。',
          ],
        },
      ],
      misconceptions: [
        {
          myth: '案例课的重点是记住这一个程序的答案。',
          clarification: '真正要带走的是流程模板：先静态建图，再动态验证，再用函数和内存证据收口。',
        },
        {
          myth: '只要最终定位到了逻辑，前面的推理过程就不重要。',
          clarification: '逆向能力靠可复用的过程积累。没有过程，下次换一个样本就容易重新迷路。',
        },
      ],
      quiz: [
        {
          question: '案例复盘里最值得留下的成果是什么？',
          options: ['只记住最后那个地址', '能复述完整推理路径和证据链', '只截图工具界面', '只记住某个快捷键'],
          answerIndex: 1,
          explanation: '因为可迁移的方法来自“我是如何定位到这里的”，而不只是某一次偶然得到的最终结果。',
        },
      ],
      quickPrompts: ['怎么做一份逆向案例复盘', '证据链为什么比结论重要', '能帮我总结这六课的固定流程吗'],
    },
  ],
};
