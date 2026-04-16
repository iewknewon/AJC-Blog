import { reverseEngineeringSubject } from './reverse-engineering';
import type { LearningSubject } from './types';

export const learningCatalog: LearningSubject[] = [
  {
    slug: 'networking',
    title: '计算机网络',
    shortTitle: '网络',
    description: '用更通俗、更可视化的方式理解协议栈、网络请求与 TCP 可靠传输，适合从“知道名词”走向“真正理解过程”。',
    eyebrow: 'Learning Track',
    colorToken: 'networking',
    icon: 'NET',
    learningPath: [
      '先看网络分层，建立全局地图',
      '再拆一次 HTTP 请求的来龙去脉',
      '最后进入 TCP 握手、重传与可靠性',
    ],
    lessons: [
      {
        subject: 'networking',
        lessonSlug: 'protocol-stack',
        title: '分层模型与协议栈',
        description: '从“为什么要分层”开始，建立网络世界的全景地图，搞清每一层到底负责什么。',
        order: 1,
        estimatedMinutes: 12,
        objectives: [
          '理解分层设计为什么能降低复杂度',
          '分清应用层、传输层、网络层、链路层的职责',
          '知道浏览网页时每一层在干什么',
        ],
        keywords: ['计算机网络', '协议栈', 'OSI', 'TCP/IP', '分层模型'],
        chatContextSummary: '本课聚焦计算机网络的分层设计与 TCP/IP 协议栈。重点是：为什么要分层、各层职责、数据如何自上而下封装、再自下而上解封装。',
        relatedLessonSlugs: ['http-request-lifecycle'],
        animation: 'protocol-stack',
        heroSummary: '先把地图搭对，再看局部细节。理解分层模型以后，后面的 HTTP、TCP 才不会碎成一堆术语。',
        sections: [
          {
            title: '为什么网络要分层',
            paragraphs: [
              '如果没有分层，浏览器发一个请求就要自己关心应用协议、数据切片、路由选择、网卡发送等所有细节。这样每改动一层，整个系统都要连带调整，复杂度会爆炸。',
              '分层的本质，就是把一个大问题拆成多个边界清晰的小问题。上层不需要知道下层怎么实现，只要相信它能提供稳定接口，这样整个系统才能演化得更快。',
            ],
          },
          {
            title: '每一层到底负责什么',
            paragraphs: [
              '应用层关注“我要表达什么”，例如 HTTP、DNS；传输层关注“这段数据怎样可靠地交给对端进程”，例如 TCP、UDP；网络层关注“这份数据应该走哪条路”，例如 IP；链路层关注“这一次在当前网络介质上怎么把帧送出去”。',
              '你可以把它想成物流系统：应用层写订单，传输层负责打包编号，网络层负责选择运输路线，链路层负责把包裹真正交到眼前这一段运输工具上。',
            ],
          },
          {
            title: '封装与解封装',
            paragraphs: [
              '当浏览器准备发送数据时，会从应用层开始往下走：应用数据先被 TCP 加上头部，再被 IP 加上头部，最后被链路层包成帧发出去。这个过程叫封装。',
              '到达对方以后，顺序反过来：链路层先把帧拆开，再交给网络层、传输层、应用层，一层层剥头部，这就是解封装。',
            ],
          },
        ],
        misconceptions: [
          {
            myth: 'OSI 七层模型就是互联网实际运行的全部标准。',
            clarification: '教学时常用 OSI 七层帮助理解，但真实工程里更常说 TCP/IP 协议栈。它们是观察网络的两种视角，不是完全一一照搬。',
          },
          {
            myth: '所有协议都只属于某一层，层与层之间完全没有交叉。',
            clarification: '分层是工程抽象，不是自然法则。真实系统里会有跨层优化和实现细节，但理解职责边界仍然非常重要。',
          },
        ],
        quiz: [
          {
            question: '浏览器访问网页时，负责“选择数据去哪里”的主要是哪一层？',
            options: ['应用层', '传输层', '网络层', '链路层'],
            answerIndex: 2,
            explanation: '网络层的核心任务之一就是路由与寻址，也就是决定数据如何到达目标网络。',
          },
        ],
        quickPrompts: ['再通俗一点解释四层职责', '举一个现实生活类比', '封装和解封装到底发生了什么'],
      },
      {
        subject: 'networking',
        lessonSlug: 'http-request-lifecycle',
        title: '一次 HTTP 请求的生命周期',
        description: '从输入 URL 到页面渲染，沿着真实链路把 DNS、TCP、TLS、HTTP 响应串起来看明白。',
        order: 2,
        estimatedMinutes: 14,
        objectives: [
          '知道从浏览器输入 URL 到收到页面发生了哪些步骤',
          '理解 DNS、TCP、TLS、HTTP 在整条链路中的位置',
          '能把“慢”定位到链路中的具体阶段',
        ],
        keywords: ['HTTP', 'DNS', 'TLS', '浏览器', '网络请求'],
        chatContextSummary: '本课围绕一次 HTTP 请求的完整生命周期，重点包括：输入 URL、DNS 解析、建立 TCP/TLS 连接、发送请求、收到响应、浏览器渲染。',
        relatedLessonSlugs: ['protocol-stack', 'tcp-reliability'],
        animation: 'http-lifecycle',
        heroSummary: '把一次请求拆成连续的小阶段后，网络性能、页面慢、证书、重定向这些问题都会开始变得可解释。',
        sections: [
          {
            title: '从输入 URL 到 DNS',
            paragraphs: [
              '浏览器拿到 URL 后，先要知道域名对应哪台服务器。于是它会查缓存、问操作系统、再必要时向 DNS 服务器发请求。',
              '这一步如果慢，你会发现页面还没开始真正连接服务器就已经耗时很高。',
            ],
          },
          {
            title: '建立连接与发送请求',
            paragraphs: [
              '拿到 IP 后，浏览器先和服务器建立 TCP 连接；如果是 HTTPS，还会继续协商 TLS。连接准备好以后，才会正式发出 HTTP 请求头和请求体。',
              '所以你常在性能面板里看到 connect、ssl、request sent 这些阶段，它们都不是同一个动作。',
            ],
          },
          {
            title: '响应回来以后浏览器还要做什么',
            paragraphs: [
              '服务器返回的不是“页面已经完成”，而是 HTML、CSS、JS、图片等资源。浏览器收到首字节后，才开始解析、构建 DOM、下载依赖、执行脚本和布局渲染。',
              '这也是为什么“后端响应快”不代表“用户看到页面快”，中间还有前端解析和资源加载成本。',
            ],
          },
        ],
        misconceptions: [
          {
            myth: 'HTTP 请求发出去以后，服务器返回 HTML 就算结束了。',
            clarification: '从用户体验看，请求回来只是开始，浏览器还要继续解析与渲染，页面才真正可见。',
          },
          {
            myth: 'DNS 只在第一次访问网站时才会发生。',
            clarification: '缓存命中时会很快，但缓存过期、不同网络环境或不同子域名都可能再次触发 DNS 查询。',
          },
        ],
        quiz: [
          {
            question: 'HTTPS 相比 HTTP，链路里通常多出的关键阶段是什么？',
            options: ['DNS 查询', 'TLS 握手', '浏览器渲染', 'HTTP 重定向'],
            answerIndex: 1,
            explanation: 'HTTPS 在 TCP 建立后通常还要经历 TLS 协商，以完成证书验证和密钥协商。',
          },
        ],
        quickPrompts: ['把一次请求拆成时间线讲讲', '为什么后端快了页面还是慢', 'DNS 慢会有什么表象'],
      },
      {
        subject: 'networking',
        lessonSlug: 'tcp-reliability',
        title: 'TCP 三次握手与可靠传输',
        description: '从建立连接、确认序号、重传和滑动窗口，真正搞懂 TCP 为什么“可靠”。',
        order: 3,
        estimatedMinutes: 16,
        objectives: [
          '说清三次握手到底在确认什么',
          '理解 TCP 为什么能做可靠传输',
          '知道重传、确认号和窗口控制的基本意义',
        ],
        keywords: ['TCP', '三次握手', '可靠传输', '重传', '滑动窗口'],
        chatContextSummary: '本课解释 TCP 的三次握手、序号与确认号、重传机制和滑动窗口。核心目标是理解 TCP 的可靠性来自哪些机制协同工作。',
        relatedLessonSlugs: ['http-request-lifecycle'],
        animation: 'tcp-flow',
        heroSummary: '很多人会背“三次握手四次挥手”，但只有把序号、确认、重传和窗口放在一起看，才真的知道 TCP 在做什么。',
        sections: [
          {
            title: '三次握手不是礼貌，而是状态确认',
            paragraphs: [
              '客户端发 SYN，表示“我想建立连接，并告诉你我的初始序号”；服务端回 SYN+ACK，表示“我收到了，也告诉你我的初始序号”；客户端再回 ACK，表示“你的序号我也收到了”。',
              '这三步确认的是：双方都能发、都能收，并且对彼此的初始序号达成一致。',
            ],
          },
          {
            title: '可靠传输靠的是一组机制，不是单个动作',
            paragraphs: [
              'TCP 通过序号、确认号、超时重传、乱序重组、流量控制等机制组合起来，才实现了“看起来像可靠字节流”的效果。',
              '如果对方没确认，发送方就知道这段数据还不能放心忘掉；如果确认到了，就可以继续推进窗口。',
            ],
          },
          {
            title: '为什么有时网络看起来卡一下又恢复',
            paragraphs: [
              '如果某些报文丢失，TCP 会等待确认或超时后重传；如果接收方来不及处理，还会通过窗口大小告诉发送方“你先慢一点”。',
              '这也是为什么弱网环境下应用不一定立刻报错，而是表现为“短暂停顿”“吞吐下降”“偶发抖动”。',
            ],
          },
        ],
        misconceptions: [
          {
            myth: '三次握手是为了传输真正的业务数据。',
            clarification: '三次握手主要是为了同步连接状态和序号，业务数据通常在连接建立后再开始发送。',
          },
          {
            myth: 'TCP 可靠就意味着一定快。',
            clarification: '可靠通常要付出额外控制与重传成本，所以 TCP 的目标是稳定可靠，而不是绝对最低延迟。',
          },
        ],
        quiz: [
          {
            question: 'TCP 中确认号的主要作用是什么？',
            options: ['告诉对方我要关闭连接', '告诉对方我已经收到哪些字节', '让 IP 选择路由', '加密数据'],
            answerIndex: 1,
            explanation: '确认号的核心作用是告诉发送方：截至某个序号之前的数据我已经成功收到了。',
          },
        ],
        quickPrompts: ['三次握手为什么不是两次', '重传和确认号怎么配合', '滑动窗口能不能再通俗一点'],
      },
    ],
  },
  {
    slug: 'computer-organization',
    title: '计算机组成原理',
    shortTitle: '组成原理',
    description: '把 CPU、内存、总线、指令周期和缓存这些抽象概念拆成能看见、能拖动、能对照现实问题的图解与互动。', 
    eyebrow: 'Learning Track',
    colorToken: 'architecture',
    icon: 'CO',
    learningPath: [
      '先建立系统总览，知道部件间关系',
      '再跟踪一条指令是如何一步步执行的',
      '最后理解缓存为什么让程序快起来',
    ],
    lessons: [
      {
        subject: 'computer-organization',
        lessonSlug: 'system-overview',
        title: 'CPU / 内存 / 总线总览',
        description: '先建立整机视角，知道谁负责计算、谁负责存储、谁负责搬运数据。',
        order: 1,
        estimatedMinutes: 12,
        objectives: [
          '理解 CPU、内存、总线、I/O 的基本分工',
          '知道“程序运行”本质上是在部件之间搬运和处理数据',
          '建立后续学习指令周期与缓存的背景',
        ],
        keywords: ['计算机组成原理', 'CPU', '内存', '总线', 'I/O'],
        chatContextSummary: '本课解释计算机系统的整体构成，重点是 CPU、主存、总线与输入输出设备的职责与协同方式。',
        relatedLessonSlugs: ['instruction-cycle', 'cache-locality'],
        animation: 'system-architecture',
        heroSummary: '先把整台机器看成一个协作系统，而不是一堆名词，后面每个细节才有位置感。',
        sections: [
          {
            title: 'CPU 是算力中心，不是全部世界',
            paragraphs: [
              'CPU 负责执行指令、做算术逻辑运算和控制流程，但它并不长期保存海量数据。它更像一个高速工作台，真正的大量内容还在主存和外设里。',
              '所以程序运行时的很多瓶颈，不一定来自 CPU 算不动，也可能来自数据根本送不过来。',
            ],
          },
          {
            title: '内存和总线承担“供应链”角色',
            paragraphs: [
              '主存负责保存程序和运行数据，总线负责在 CPU、内存、I/O 之间传输地址、数据和控制信号。',
              '如果没有总线，部件之间就像彼此失联；如果没有内存，CPU 也没有足够原料可用。',
            ],
          },
          {
            title: '程序运行其实是连续的小协作',
            paragraphs: [
              '一条指令执行前，先从内存取出来；执行时可能还要再取操作数；结果又可能回写内存。看似“CPU 在计算”，其实背后是整个系统不断配合。',
              '这就是为什么理解组成原理，不能只盯着某一个部件，而要看数据流。',
            ],
          },
        ],
        misconceptions: [
          {
            myth: 'CPU 强，整台机器就一定快。',
            clarification: '如果数据供不上、缓存命中差、内存访问慢，再强的 CPU 也会经常空等。',
          },
          {
            myth: '内存只是一个大仓库，和执行过程没太大关系。',
            clarification: '几乎每条指令都和内存相关，取指、取数、写回都离不开它。',
          },
        ],
        quiz: [
          {
            question: '下列哪项最适合描述总线的角色？',
            options: ['负责执行加减乘除', '负责长久保存程序', '负责在部件之间传输信息', '负责显示图像'],
            answerIndex: 2,
            explanation: '总线是部件之间的信息通路，负责传地址、数据和控制信号。',
          },
        ],
        quickPrompts: ['把 CPU、内存、总线比喻成现实系统', '为什么说程序运行是数据流', 'I/O 在整机里算什么角色'],
      },
      {
        subject: 'computer-organization',
        lessonSlug: 'instruction-cycle',
        title: '指令执行周期',
        description: '沿着取指、译码、执行、访存、写回一步步走，真正理解一条指令怎样变成硬件动作。',
        order: 2,
        estimatedMinutes: 14,
        objectives: [
          '知道一条指令从取出到完成的典型阶段',
          '理解控制器、寄存器、ALU 在周期中的配合',
          '把抽象指令和底层硬件动作连起来',
        ],
        keywords: ['指令周期', '取指', '译码', '执行', '写回'],
        chatContextSummary: '本课讲解一条指令如何经历取指、译码、执行、访存和写回，各阶段涉及哪些硬件部件，以及为什么这能帮助理解 CPU 工作机制。',
        relatedLessonSlugs: ['system-overview', 'cache-locality'],
        animation: 'instruction-cycle',
        heroSummary: '当你能跟踪一条指令穿过 CPU 的路径时，很多“寄存器”“控制器”“流水线”才开始真正有含义。',
        sections: [
          {
            title: '取指是起点',
            paragraphs: [
              'CPU 会根据程序计数器 PC 指向的地址，从内存中把下一条指令取出来放进指令寄存器。没有这一步，后面的译码和执行都无从谈起。',
              '所以程序计数器像一个“当前任务指针”，总是在告诉 CPU：下一步去哪里拿活。',
            ],
          },
          {
            title: '译码是在理解“这条指令要我做什么”',
            paragraphs: [
              '译码阶段会识别操作码、寄存器位置、寻址方式等信息，把一串二进制变成内部控制信号。',
              '你可以把它理解成“把压缩命令翻译成车间作业单”。',
            ],
          },
          {
            title: '执行与写回才是结果落地',
            paragraphs: [
              'ALU 或其他执行单元会真的做运算；如果指令需要读写内存，还会进入访存阶段；最后结果写回寄存器或内存。',
              '这样一整圈下来，程序状态才真正发生变化。',
            ],
          },
        ],
        misconceptions: [
          {
            myth: '一条指令就是 CPU 一瞬间直接完成的一个动作。',
            clarification: '从硬件视角看，一条指令往往要经过多个阶段，内部会发生一连串配合与状态变更。',
          },
          {
            myth: '只有算术指令才会走执行阶段。',
            clarification: '执行阶段不只是做加减乘除，跳转、比较、地址计算等也都属于执行的一部分。',
          },
        ],
        quiz: [
          {
            question: '程序计数器 PC 的典型作用是什么？',
            options: ['保存当前计算结果', '指向下一条将要取出的指令地址', '缓存所有变量', '执行逻辑运算'],
            answerIndex: 1,
            explanation: 'PC 负责告诉 CPU 下一条应该从哪里取指，是控制执行流的关键寄存器。',
          },
        ],
        quickPrompts: ['把取指译码执行串成一个故事', '寄存器和内存到底怎么配合', '为什么理解指令周期有助于学汇编'],
      },
      {
        subject: 'computer-organization',
        lessonSlug: 'cache-locality',
        title: '缓存与局部性',
        description: '从“为什么主存太慢”讲到局部性原理，理解缓存命中、失效和程序性能之间的关系。',
        order: 3,
        estimatedMinutes: 15,
        objectives: [
          '理解缓存存在的根本原因',
          '知道时间局部性和空间局部性是什么意思',
          '把缓存命中率和程序写法联系起来',
        ],
        keywords: ['Cache', '局部性', '命中率', '缓存失效', '性能'],
        chatContextSummary: '本课解释缓存为什么存在、局部性原理是什么、缓存命中和失效如何影响性能，以及程序访问模式为什么会改变速度。',
        relatedLessonSlugs: ['system-overview', 'instruction-cycle'],
        animation: 'cache-locality',
        heroSummary: '缓存不是魔法，它只是赌你“接下来还会用到附近的数据”。一旦看懂这个赌注，很多性能现象都会变得直观。',
        sections: [
          {
            title: '为什么需要缓存',
            paragraphs: [
              'CPU 很快，主存相对慢，如果每次都直连主存，CPU 会频繁空等。缓存的出现，就是为了把“近期最可能用到”的数据先放在更近更快的位置。',
              '它本质上是在用更小、更贵、更快的存储换取整体效率。',
            ],
          },
          {
            title: '局部性是缓存成立的前提',
            paragraphs: [
              '时间局部性指的是：刚访问过的数据，很快还会再访问；空间局部性指的是：访问了某个位置，附近位置也很可能被访问。',
              '如果程序访问模式符合局部性，缓存就容易命中；反过来，随机跳跃访问往往会让缓存效果变差。',
            ],
          },
          {
            title: '程序写法为什么会影响性能',
            paragraphs: [
              '同样的算法，如果数据访问顺序不同，缓存命中率就可能差很多。比如按行遍历二维数组和跨行乱跳，底层看到的内存访问模式完全不一样。',
              '所以“代码快不快”有时不仅取决于算了多少，还取决于怎么访问数据。',
            ],
          },
        ],
        misconceptions: [
          {
            myth: '缓存越大越好，越大就一定越快。',
            clarification: '缓存不仅看容量，还要看层级、延迟、命中率和访问模式。更大不一定总是更有效。',
          },
          {
            myth: '局部性只是底层细节，和应用开发关系不大。',
            clarification: '当你处理大数组、矩阵、图像、数据库页时，访问模式会直接影响缓存行为，从而影响程序性能。',
          },
        ],
        quiz: [
          {
            question: '下面哪种说法最符合“空间局部性”？',
            options: ['刚访问过的数据很快还会再访问', '访问了一个地址后，附近地址也很可能会被访问', '主存比缓存更快', '缓存只存代码不存数据'],
            answerIndex: 1,
            explanation: '空间局部性强调地址上的邻近性，访问一个位置后，附近位置也常常会被访问。',
          },
        ],
        quickPrompts: ['局部性为什么让缓存有效', '举个数组访问的例子', '缓存失效会有什么表现'],
      },
    ],
  },
  {
    slug: 'ai-agent-engineering',
    title: 'AI / Agent 工程基础',
    shortTitle: 'AI 工程',
    description: '把 Agent、Skill、Tool、MCP、RAG、Memory、Workflow 这些热门概念放回同一张工程地图里，讲清它们分别是什么、彼此如何协作，以及真实系统里该放在哪一层。',
    eyebrow: 'Learning Track',
    colorToken: 'ai-agent',
    icon: 'AG',
    learningPath: [
      '先用一张全景图建立 AI / Agent 工程地图',
      '再拆开 Agent、Tool、Skill、MCP、RAG、Memory 等关键概念',
      '最后建立多代理协作、评测、防护和可观测性的系统视角',
    ],
    lessons: [
      {
        subject: 'ai-agent-engineering',
        lessonSlug: 'agent-landscape',
        title: '一张图看懂 AI / Agent 工程全景',
        description: '先把模型、提示词、工具、代理、工作流、记忆、检索、防护放在一张图里，建立完整地图。',
        order: 1,
        estimatedMinutes: 14,
        objectives: [
          '知道 Model、Prompt、Tool、Agent、Workflow、Memory、RAG、Guardrails 各自处在哪一层',
          '理解为什么这些词不能混成一个模糊的“AI 系统”',
          '为后续拆解课建立统一的概念坐标系',
        ],
        keywords: ['AI Agent', 'Agent', 'Workflow', 'Tool Use', 'Memory', 'RAG', 'Guardrails', 'Evals'],
        chatContextSummary: '本课是 AI / Agent 工程专题的总览课，重点是把模型、提示词、工具、工作流、代理、记忆、检索、防护和评测放进同一张工程地图中。',
        relatedLessonSlugs: ['what-is-an-agent', 'workflow-vs-agent', 'memory-context-window'],
        animation: 'ai-agent-landscape',
        heroSummary: '先把地图搭对，再看细节。很多人觉得这些词都在讲“AI 能力”，但它们真正区分的是系统里的不同层和不同职责。',
        sections: [
          {
            title: '为什么一开始就要先看全景图',
            paragraphs: [
              '如果一上来就直接学 MCP、RAG、Agent Loop 这些局部名词，用户很容易只记住定义，却不知道它们在系统里到底处在哪一层，于是后面一遇到真实架构图就会乱。',
              '先看全景图的目的，是把“模型负责生成、工具负责连接外部能力、工作流负责固定编排、代理负责围绕目标循环决策、记忆负责保留状态、检索负责补知识、防护负责控风险”这套边界先搭起来。',
            ],
          },
          {
            title: '这些热门词分别在解决什么问题',
            paragraphs: [
              'Prompt 解决的是“如何更清楚地表达任务与约束”；Tool / Function Calling 解决的是“模型如何触发外部能力”；Workflow 解决的是“怎样把固定步骤稳定串起来”；Agent 解决的是“在不确定路径中怎样决定下一步动作”。',
              'Memory 解决的是“系统如何跨轮记住状态”；RAG 解决的是“怎样把外部知识补进当前上下文”；Guardrails 和 Evals 解决的是“系统如何更可控、更可测、更可观察”。',
            ],
          },
          {
            title: '从产品视角看，它们不是同一个东西',
            paragraphs: [
              '一个只会生成答案的聊天框，和一个能查资料、做计划、调用工具、根据结果继续决策的代理系统，在工程上不是同一类东西。它们可能都由大模型驱动，但外层系统设计差异非常大。',
              '所以理解 AI / Agent 工程，关键不是背更多热词，而是把这些词放回系统层级里，知道谁是底座、谁是接口、谁是行为模式、谁是治理手段。',
            ],
          },
        ],
        misconceptions: [
          {
            myth: '只要用了大模型，整个系统就自动算 Agent。',
            clarification: '大模型只是底座能力。是否是 Agent，要看系统是否围绕目标持续感知状态、决定动作并执行，而不是只看底层用了什么模型。',
          },
          {
            myth: 'Prompt、RAG、Tool、Agent、MCP 都差不多，只是不同厂商的说法。',
            clarification: '这些词分别对应不同工程层。把它们混在一起，会导致系统设计既不清晰也不稳定。',
          },
        ],
        quiz: [
          {
            question: '下面哪项最适合描述 RAG 的核心作用？',
            options: ['控制模型语气', '给当前回答补充外部检索到的知识', '决定 UI 配色', '替代数据库'],
            answerIndex: 1,
            explanation: 'RAG 的核心价值是把外部检索结果拼装进当前上下文，让模型在回答时拥有更贴近当前问题的资料。',
          },
        ],
        quickPrompts: ['把这些词放进一张工程图里', '先给我一个最白话的全景解释', '这些概念分别属于哪一层'],
      },
      {
        subject: 'ai-agent-engineering',
        lessonSlug: 'what-is-an-agent',
        title: '什么是 AI Agent',
        description: '把“会调用工具的大模型”和“真正的代理系统”分开看，建立 Agent 的最小定义。',
        order: 2,
        estimatedMinutes: 12,
        objectives: [
          '区分模型回答、工具调用和代理执行循环',
          '理解 Agent 至少需要目标、状态、决策和执行',
          '知道为什么不是所有聊天机器人都算 Agent',
        ],
        keywords: ['AI Agent', 'Agent', 'Agent Loop', 'Goal', 'State', 'Tool Use', 'Workflow'],
        chatContextSummary: '本课聚焦 AI Agent 的最小定义、目标驱动执行循环、状态感知和与普通工具调用系统的边界。',
        relatedLessonSlugs: ['agent-landscape', 'workflow-vs-agent', 'planning-reasoning-execution'],
        animation: 'ai-agent-landscape',
        heroSummary: 'Agent 不是“会聊天的模型”，而是“能围绕目标不断判断下一步该做什么的系统”。',
        sections: [
          {
            title: 'Agent 的最小定义',
            paragraphs: [
              '如果一个系统只是在收到输入后直接生成一个回答，那么它更接近“模型问答”。如果它能够围绕目标保留状态、决定下一步动作、调用工具、根据结果继续前进，那才更接近 Agent。',
              '所以 Agent 的关键不是“有没有工具”，而是“有没有以目标为中心的决策循环”。',
            ],
          },
          {
            title: '为什么目标和状态这么重要',
            paragraphs: [
              '没有目标，系统就不知道该朝什么方向推进；没有状态，系统就不知道自己已经做到了哪一步。很多伪 Agent 系统的问题，恰恰是只会随机调用工具，却没有稳定追踪当前进度。',
              '你可以把 Agent 想成一个会看地图、会记位置、会选下一步路线的人，而不是一台只会回答单个问题的自动售货机。',
            ],
          },
          {
            title: '会用工具，不等于一定是 Agent',
            paragraphs: [
              '一个模型收到“请帮我查今天的天气”，然后调用一次天气工具再返回答案，这更像带工具调用的问答系统。只有当系统会根据中间结果继续规划、继续决策，它才真正往 Agent 靠近。',
              '所以“Tool Use”是 Agent 常见能力之一，但不是 Agent 的唯一判定标准。',
            ],
          },
        ],
        misconceptions: [
          {
            myth: '只要能 function calling，它就是 Agent。',
            clarification: 'Function calling 是能力接口，不是系统形态。真正的 Agent 还需要目标、状态、决策循环和执行推进。',
          },
          {
            myth: 'Agent 必须非常复杂，能自己做几十步任务才算。',
            clarification: 'Agent 可以强也可以弱。关键不是步数多少，而是是否存在围绕目标持续决定下一步动作的机制。',
          },
        ],
        quiz: [
          {
            question: '下面哪种系统最符合 Agent 的定义？',
            options: ['收到问题直接生成回答', '调用一次搜索工具后立即返回结果', '围绕目标保留状态、决定动作、执行并根据结果继续推进', '只把数据库内容原样返回'],
            answerIndex: 2,
            explanation: 'Agent 的核心是目标驱动的执行循环，而不是单次生成或单次工具调用。',
          },
        ],
        quickPrompts: ['Agent 和普通聊天机器人差在哪', '再给一个现实生活类比', '为什么工具调用不等于 Agent'],
      },
      {
        subject: 'ai-agent-engineering',
        lessonSlug: 'skill-tool-function-calling',
        title: 'Skill、Tool、Function Calling 到底是什么关系',
        description: '把技能封装、工具能力和模型调用接口分层拆开，避免把它们混成一个词。',
        order: 3,
        estimatedMinutes: 13,
        objectives: [
          '分清 Skill、Tool、Function Calling 分别对应什么层次',
          '理解为什么 Function Calling 更像接口，而 Skill 更像能力封装',
          '知道在系统设计中应该把哪个概念放在哪一层',
        ],
        keywords: ['Skill', 'Tool', 'Function Calling', 'Structured Output', 'Tool Use', 'Capability Wrapper'],
        chatContextSummary: '本课专门区分 Skill、Tool 和 Function Calling 的层次关系：Skill 是能力封装，Tool 是外部能力单元，Function Calling 是模型触发工具的接口方式。',
        relatedLessonSlugs: ['what-is-an-agent', 'mcp-explained', 'prompt-engineering-boundaries'],
        animation: 'skill-tool-function',
        heroSummary: 'Function Calling 更像“模型怎样发起调用”，Tool 更像“能被调用的外部能力”，Skill 则更像“围绕某类任务打包好的能力组合”。',
        sections: [
          {
            title: 'Function Calling 更接近协议接口',
            paragraphs: [
              'Function Calling 的重点，不是定义业务本身，而是让模型用结构化方式表达“我现在想调用哪个函数、传什么参数”。它解决的是接口触发问题。',
              '所以你可以把它理解成模型和外部系统之间的一种标准化说话方式，而不是一个完整功能本身。',
            ],
          },
          {
            title: 'Tool 是外部能力单元',
            paragraphs: [
              'Tool 可能是搜索、数据库查询、发送邮件、读写文件，也可能是一个更复杂的业务 API。它解决的是“系统外部到底能做什么”。',
              'Tool 自己不等于会被好好用起来，因为是否调用、何时调用、调用顺序如何，往往还取决于上层逻辑。',
            ],
          },
          {
            title: 'Skill 是更高层的能力封装',
            paragraphs: [
              'Skill 往往不是一个底层接口，而是一套围绕某类任务整理好的提示词、步骤、工具使用习惯和约束。例如“小说写作技能”“代码审查技能”更像把经验打成一个可复用能力包。',
              '因此 Skill 往往站在 Tool 之上，对具体任务给出更稳定的执行方式。',
            ],
          },
        ],
        misconceptions: [
          {
            myth: 'Skill 和 Tool 只是两个名字，本质完全一样。',
            clarification: 'Tool 更像外部能力单元，Skill 更像围绕任务打包出的能力模板，它们处于不同抽象层。',
          },
          {
            myth: 'Function Calling 会自动保证工具一定被正确使用。',
            clarification: 'Function Calling 只提供结构化调用入口，是否调用合理、参数是否合适、结果如何处理，仍然取决于上层系统设计。',
          },
        ],
        quiz: [
          {
            question: '下面哪项最适合描述 Function Calling？',
            options: ['一个长期记忆系统', '模型触发结构化外部调用的接口方式', '数据库本身', '页面样式系统'],
            answerIndex: 1,
            explanation: 'Function Calling 的核心是让模型以结构化方式表达外部调用意图，而不是直接代表某个业务能力本身。',
          },
        ],
        quickPrompts: ['Skill 和 Tool 再白话一点', 'Function Calling 为什么是接口层', '举一个三者配合的例子'],
      },
      {
        subject: 'ai-agent-engineering',
        lessonSlug: 'mcp-explained',
        title: 'MCP 是什么，为什么它会火',
        description: '把 MCP 放回 Host、Client、Server、Tool、Resource 的通路里，理解它在标准化连接层上到底解决了什么。',
        order: 4,
        estimatedMinutes: 13,
        objectives: [
          '理解 MCP 主要解决的是模型应用和外部能力之间的标准化连接问题',
          '知道 Host、Client、MCP Server、Tool、Resource 分别扮演什么角色',
          '理解为什么 MCP 的流行与 Agent 工程的生态化有关',
        ],
        keywords: ['MCP', 'Model Context Protocol', 'MCP Server', 'Resource', 'Tool', 'Host', 'Client'],
        chatContextSummary: '本课讲解 MCP 的角色划分、连接路径、为什么它在 AI 工程生态中很火，以及它与普通 API 包装的区别。',
        relatedLessonSlugs: ['skill-tool-function-calling', 'workflow-vs-agent', 'agent-landscape'],
        animation: 'mcp-flow',
        heroSummary: 'MCP 之所以火，不是因为它让模型突然变聪明了，而是因为它让“接不同能力”这件事更像接标准插座，而不是每次都手搓一套线。',
        sections: [
          {
            title: 'MCP 在解决什么问题',
            paragraphs: [
              '过去每接一个工具、数据库、文件系统、知识源，很多应用都要各自定义一套连接方式、权限模型和调用格式，结果生态很碎，迁移成本很高。',
              'MCP 想做的是把这层连接方式标准化，让 Host 和不同的 MCP Server 之间可以用更统一的方式交换工具、资源和上下文。',
            ],
          },
          {
            title: 'Host、Client、Server、Tool、Resource 怎么分',
            paragraphs: [
              'Host 是用户真正使用的应用外壳，Client 负责在 Host 内与 MCP Server 通信，MCP Server 则把具体能力暴露出来。被暴露出来的内容可能是 Tool，也可能是 Resource。',
              'Tool 更偏“可执行动作”，例如搜索、写文件、查数据库；Resource 更偏“可读取上下文”，例如文档、知识条目、配置说明。',
            ],
          },
          {
            title: '为什么它会火',
            paragraphs: [
              '因为 AI 应用越来越像一层“会协调很多外部能力的中枢”，而不是一段单纯的文本生成逻辑。连接层一旦标准化，生态协作速度就会明显变快。',
              'MCP 让“接更多外部能力”从定制开发，逐步变成更像搭积木的体验，所以它自然会成为 Agent 工程里的热门词。',
            ],
          },
        ],
        misconceptions: [
          {
            myth: '用了 MCP，模型就会自动拥有这些外部能力。',
            clarification: 'MCP 只是标准化连接层。是否调用、如何调用、权限是否放开，仍然由具体应用和上层代理逻辑决定。',
          },
          {
            myth: 'MCP 只是换了个名字的普通 REST API。',
            clarification: 'API 是能力本身的接口，MCP 关注的是模型应用如何标准化地发现、读取和调用这些能力。',
          },
        ],
        quiz: [
          {
            question: '在 MCP 语境下，哪类对象更偏“可读取的上下文材料”？',
            options: ['Resource', 'Guardrail', 'Prompt', 'Eval'],
            answerIndex: 0,
            explanation: 'Resource 更偏可读取的上下文材料，而 Tool 更偏可执行动作。',
          },
        ],
        quickPrompts: ['MCP 和普通 API 差在哪', 'Host、Client、Server 再串起来讲讲', '为什么大家都在提 MCP'],
      },
      {
        subject: 'ai-agent-engineering',
        lessonSlug: 'workflow-vs-agent',
        title: 'Workflow 和 Agent 有什么区别',
        description: '把固定编排和目标驱动决策分开看，避免把任何自动化流程都叫成 Agent。',
        order: 5,
        estimatedMinutes: 12,
        objectives: [
          '理解 Workflow 的核心是预先编排好的固定步骤',
          '理解 Agent 的核心是面对不确定路径时的动态决策',
          '知道什么时候用 Workflow 更稳，什么时候需要 Agent',
        ],
        keywords: ['Workflow', 'Agent', 'Orchestration', 'Decision Loop', 'Automation'],
        chatContextSummary: '本课聚焦 Workflow 与 Agent 的边界：前者偏固定编排，后者偏目标驱动决策。重点是场景适配，而不是概念抬高。',
        relatedLessonSlugs: ['what-is-an-agent', 'planning-reasoning-execution', 'multi-agent-collaboration'],
        animation: 'workflow-vs-agent',
        heroSummary: 'Workflow 更像按剧本走的流程，Agent 更像在路上边看情况边做决定的人。',
        sections: [
          {
            title: 'Workflow 的强项是稳定和可控',
            paragraphs: [
              '如果任务步骤已知、分支有限、顺序明确，那么 Workflow 往往更可靠、更好测、更好治理。例如固定的数据清洗链路、内容审核流程、模板化报告生成都很适合 Workflow。',
              '它的价值在于可预测，而不是显得更“智能”。',
            ],
          },
          {
            title: 'Agent 的价值在于处理不确定路径',
            paragraphs: [
              '当系统需要根据中间结果动态决定下一步做什么时，例如检索失败要不要换策略、工具结果不完整要不要追问、任务拆分后要不要重新规划，这类情况才更适合 Agent。',
              'Agent 强在决策弹性，但代价通常是更难控、更难测。',
            ],
          },
          {
            title: '真实系统里常常是两者组合',
            paragraphs: [
              '很多成熟系统并不是二选一，而是用 Workflow 托住大框架，再在局部高不确定区间引入 Agent 决策。这样既能保住稳定性，又能给系统留出灵活度。',
              '所以不要把 Workflow 看成落后方案，也不要把 Agent 神化成万能方案。',
            ],
          },
        ],
        misconceptions: [
          {
            myth: '只要是自动化流程，就应该升级成 Agent。',
            clarification: '如果任务本身路径明确，Agent 反而可能增加不必要的不确定性和治理成本。',
          },
          {
            myth: 'Workflow 不智能，Agent 才高级。',
            clarification: '两者解决的问题不同。Workflow 的价值在于稳，Agent 的价值在于应对不确定。',
          },
        ],
        quiz: [
          {
            question: '哪种场景通常更适合 Workflow 而不是 Agent？',
            options: ['步骤固定、结果格式明确的自动报告生成', '需要根据多轮检索结果动态调整策略的研究任务', '需要边执行边重规划的长任务', '需要在未知分支里不断选择下一步'],
            answerIndex: 0,
            explanation: '步骤固定、结果明确的场景更适合 Workflow，因为它更可控、更稳定。',
          },
        ],
        quickPrompts: ['Workflow 和 Agent 用一个类比讲讲', '真实系统里怎么组合两者', '为什么不是所有流程都要 Agent'],
      },
      {
        subject: 'ai-agent-engineering',
        lessonSlug: 'prompt-engineering-boundaries',
        title: 'Prompt Engineering 到底解决什么，不解决什么',
        description: '把提示词放回它该在的位置，既不过度神化，也不低估它的作用。',
        order: 6,
        estimatedMinutes: 11,
        objectives: [
          '理解 Prompt Engineering 更偏任务表达与约束设计',
          '知道为什么很多系统问题不能只靠改提示词解决',
          '能分辨提示词问题与数据、工具、记忆、流程问题',
        ],
        keywords: ['Prompt Engineering', 'System Prompt', 'User Prompt', 'Prompt Design', 'Constraint'],
        chatContextSummary: '本课聚焦提示词工程的边界：它擅长表达目标、约束和格式要求，但不能替代检索、记忆、工具和系统治理。',
        relatedLessonSlugs: ['skill-tool-function-calling', 'memory-context-window', 'rag-knowledge-retrieval'],
        animation: 'skill-tool-function',
        heroSummary: '提示词很重要，但它更像“把任务说清楚”，不是“把系统所有短板一把补齐”。',
        sections: [
          {
            title: 'Prompt 真正擅长的是什么',
            paragraphs: [
              'Prompt 最擅长的是明确目标、角色、语气、格式、约束和输出标准，让模型更清楚当前任务想要什么、不想要什么。',
              '它像给一个能力很强但读心术不稳定的同事写任务说明书，说明得越具体，执行偏差通常越小。',
            ],
          },
          {
            title: '哪些问题不能只靠 Prompt 修',
            paragraphs: [
              '如果模型没有最新知识、没有外部数据、没有工具能力、没有长期记忆、没有稳定工作流，那么你再怎么写 Prompt，也很难凭空补齐这些系统能力。',
              '很多“我再调调提示词应该就好了”的情况，本质上是数据层、检索层、工具层或流程层的问题。',
            ],
          },
          {
            title: '怎么判断该改 Prompt 还是改系统',
            paragraphs: [
              '如果问题主要体现在输出风格不稳定、格式经常不对、任务意图理解偏差大，优先检查 Prompt；如果问题是信息缺失、事实陈旧、工具不用、跨轮失忆、结果不可测，优先检查系统层。',
              '这是 AI 工程里非常重要的一种诊断思维。',
            ],
          },
        ],
        misconceptions: [
          {
            myth: 'Prompt Engineering 是 AI 系统表现好坏的唯一关键。',
            clarification: 'Prompt 很重要，但它只是系统中的一层。很多能力差异来自检索、工具、记忆、流程和防护设计。',
          },
          {
            myth: '只要不断堆更多提示词，系统就会越来越稳。',
            clarification: '过度堆叠提示词反而可能让目标变混乱。提示词需要清楚，不是越长越好。',
          },
        ],
        quiz: [
          {
            question: '下面哪类问题最可能优先通过改 Prompt 来改善？',
            options: ['模型缺少最新行业数据', '输出格式总是偏离要求', '没有接入搜索工具', '系统无法跨会话记住项目设定'],
            answerIndex: 1,
            explanation: '输出格式偏离通常是任务表达和约束不够清晰，优先检查 Prompt 会更合理。',
          },
        ],
        quickPrompts: ['Prompt 工程最容易被夸大的地方是什么', '怎么判断该改 Prompt 还是改系统', '系统提示词和用户提示词怎么分工'],
      },
      {
        subject: 'ai-agent-engineering',
        lessonSlug: 'memory-context-window',
        title: 'Memory、Context、Context Window',
        description: '把当前上下文、短期记忆和长期记忆放在一起看，理解 AI 系统为什么会“记得住”或“忘得快”。',
        order: 7,
        estimatedMinutes: 13,
        objectives: [
          '区分当前上下文、摘要记忆、长期资料存储的角色',
          '理解 Context Window 为什么会限制单轮可带入的信息量',
          '知道为什么长任务需要摘要、检索或外部记忆机制',
        ],
        keywords: ['Memory', 'Context', 'Context Window', 'Long-term Memory', 'Short-term Context', 'Summarization'],
        chatContextSummary: '本课解释上下文窗口、短时上下文、摘要记忆和长期记忆之间的区别，以及为什么长任务需要额外的状态管理机制。',
        relatedLessonSlugs: ['prompt-engineering-boundaries', 'rag-knowledge-retrieval', 'multi-agent-collaboration'],
        animation: 'memory-context',
        heroSummary: '模型眼前能看到的只是“当前窗口里的内容”，而系统记不记得更早的事情，往往取决于你有没有额外设计记忆机制。',
        sections: [
          {
            title: 'Context 更像当前工作台',
            paragraphs: [
              '当前上下文就是模型这一次真正能“看到”的输入材料。它像一张工作台，能摆的信息有限，摆进去什么、怎样组织，都会影响这一轮输出。',
              'Context Window 则决定了这张工作台能装多少内容。超出窗口的信息，不会自动被模型继续保有。',
            ],
          },
          {
            title: 'Memory 不是同一个东西',
            paragraphs: [
              '很多系统把上一轮对话原样拼回去，这更像“延长上下文”；而真正的长期记忆往往需要摘要、结构化存储或检索机制，保证系统能在需要时重新把关键信息取回来。',
              '所以 Memory 更像“系统如何保留和找回状态”，而不只是“把历史消息一直往前堆”。',
            ],
          },
          {
            title: '为什么长任务必须管理记忆',
            paragraphs: [
              '一旦任务足够长，信息量就会超过窗口，系统如果没有摘要、分层记忆或检索回填机制，就会出现前文设定丢失、目标漂移、上下文污染等问题。',
              '这也是为什么做长篇小说、长期项目助理或多阶段任务时，记忆设计非常关键。',
            ],
          },
        ],
        misconceptions: [
          {
            myth: '只要模型窗口够大，就不需要记忆系统。',
            clarification: '窗口大只能缓解单轮承载问题，不能替代摘要、筛选、结构化状态和长期找回机制。',
          },
          {
            myth: 'Memory 就是简单保存全部历史消息。',
            clarification: '真正有用的 Memory 更关注“如何在需要时取回正确的信息”，而不是机械地把一切历史都塞回去。',
          },
        ],
        quiz: [
          {
            question: '下面哪项最适合描述 Context Window？',
            options: ['数据库大小', '模型本轮可直接看到的信息容量范围', '模型训练总语料量', '浏览器缓存大小'],
            answerIndex: 1,
            explanation: 'Context Window 说的是模型这一次推理时能直接接触到的输入范围。',
          },
        ],
        quickPrompts: ['上下文和记忆再白话一点', '为什么长任务会失忆', '窗口大是不是就够了'],
      },
      {
        subject: 'ai-agent-engineering',
        lessonSlug: 'rag-knowledge-retrieval',
        title: 'RAG、知识库、检索增强',
        description: '把“去哪里找资料、怎么选资料、怎么塞回上下文”这条链路拆开看，理解 RAG 真正发挥作用的地方。',
        order: 8,
        estimatedMinutes: 13,
        objectives: [
          '理解 RAG 不只是“搜一下再回答”，而是一条完整资料回填链路',
          '知道检索、筛选、重排、拼装上下文分别解决什么问题',
          '区分模型已有知识与当前检索到的外部知识',
        ],
        keywords: ['RAG', 'Retrieval Augmented Generation', 'Knowledge Base', 'Retrieval', 'Rerank', 'Context Assembly'],
        chatContextSummary: '本课聚焦 RAG 的完整管线，包括查询、检索、重排、上下文拼装和回答生成，重点解释为什么 RAG 不是简单搜索。',
        relatedLessonSlugs: ['memory-context-window', 'prompt-engineering-boundaries', 'guardrails-evals-observability'],
        animation: 'rag-pipeline',
        heroSummary: 'RAG 的关键，不只是“找到资料”，而是“把最相关的资料以可消费的方式放回当前上下文里”。',
        sections: [
          {
            title: 'RAG 到底在做什么',
            paragraphs: [
              'RAG 的目标，是在回答前先去外部资料源里找和当前问题最相关的信息，再把这些信息拼进当前上下文，让模型基于更贴近当前问题的材料作答。',
              '所以它本质上是在补“当前可见知识”，而不是改写模型本身的长期参数。',
            ],
          },
          {
            title: '为什么不是搜一下就完事',
            paragraphs: [
              '如果搜到一堆结果就全塞给模型，通常会导致噪声太大、上下文污染、重点不清。真正有效的 RAG 往往还需要筛选、重排和上下文拼装。',
              '这就像做研究时不是把整柜资料都丢给同事，而是先帮他挑最相关的几页，再按问题组织好重点。',
            ],
          },
          {
            title: '知识库和 RAG 不是一回事',
            paragraphs: [
              '知识库是资料的存储与组织方式；RAG 是“怎样从这些资料里为当前问题取回、筛选和回填内容”的方法链。',
              '你可以有知识库但没有好 RAG，也可以有 RAG 但资料源并不理想，最终效果都不会太稳。',
            ],
          },
        ],
        misconceptions: [
          {
            myth: 'RAG 就是给模型加一个搜索框。',
            clarification: '真正的 RAG 还包括查询表达、检索策略、重排、摘要或上下文拼装，不只是单纯搜索。',
          },
          {
            myth: '有了知识库，回答就一定可靠。',
            clarification: '资料能不能被正确取回、筛得准不准、最终拼进上下文的方式好不好，都会影响结果质量。',
          },
        ],
        quiz: [
          {
            question: 'RAG 中 rerank 的主要作用是什么？',
            options: ['训练模型参数', '重新排序候选资料，优先保留最相关结果', '清空上下文', '关闭工具调用'],
            answerIndex: 1,
            explanation: 'Rerank 的重点是对候选资料做二次排序，尽量让最相关内容排到前面进入最终上下文。',
          },
        ],
        quickPrompts: ['RAG 为什么不是简单搜索', '知识库和 RAG 的关系', '检索和重排分别干什么'],
      },
      {
        subject: 'ai-agent-engineering',
        lessonSlug: 'planning-reasoning-execution',
        title: 'Planning、Reasoning、Execution',
        description: '把计划、推理和执行分开，理解为什么很多长任务失败，不是因为模型不会答，而是因为系统不会推进。',
        order: 9,
        estimatedMinutes: 12,
        objectives: [
          '区分 Planning、Reasoning、Execution 的职责',
          '理解为什么长任务需要显式计划而不是一直临场生成',
          '知道执行反馈为什么会反过来影响后续推理和计划',
        ],
        keywords: ['Planning', 'Reasoning', 'Execution', 'Agent Loop', 'Task Decomposition', 'Feedback'],
        chatContextSummary: '本课聚焦计划、推理和执行三个阶段的分工，以及为什么执行反馈会不断反哺下一步决策。',
        relatedLessonSlugs: ['what-is-an-agent', 'workflow-vs-agent', 'multi-agent-collaboration'],
        animation: 'ai-agent-landscape',
        heroSummary: '会推理不等于会完成任务。真正长任务里，更难的是“怎样把目标拆开、执行出去、再根据结果继续前进”。',
        sections: [
          {
            title: 'Planning 是决定大方向',
            paragraphs: [
              'Planning 更关注“这件事整体应该怎么拆、先做什么后做什么、哪些步骤依赖前置结果”，它像任务地图。',
              '没有规划的系统很容易一上来就盯着局部问题回答得很热闹，但整体推进效率很差。',
            ],
          },
          {
            title: 'Reasoning 是判断当下',
            paragraphs: [
              'Reasoning 更像在当前节点上做判断：这个结果可信吗、下一步最合理的动作是什么、是否需要换策略。',
              '它通常发生在局部决策点，不一定直接代表整条任务路线已经被安排好了。',
            ],
          },
          {
            title: 'Execution 会把想法变成现实反馈',
            paragraphs: [
              'Execution 才是真正去调用工具、访问资源、写文件、发请求、产出结果的阶段。只停留在“想得很对”，任务是不会完成的。',
              '而且执行结果常常会反过来修正原来的计划，所以真正的代理循环里，这三者是不断往返的。',
            ],
          },
        ],
        misconceptions: [
          {
            myth: '推理能力强，就一定能把长任务做好。',
            clarification: '长任务还依赖计划拆解、状态追踪和执行反馈。只会答题式推理，不一定会稳定推进任务。',
          },
          {
            myth: 'Planning 只要做一次，后面不用再改。',
            clarification: '很多真实任务在执行后会暴露新信息，所以计划常常需要动态修正。',
          },
        ],
        quiz: [
          {
            question: '下面哪项最适合归入 Execution？',
            options: ['判断当前结果是否可信', '把一个大任务拆成多个子任务', '真正调用搜索、文件或 API 去执行动作', '给系统定义角色语气'],
            answerIndex: 2,
            explanation: 'Execution 关注的是把决策真正执行出去，而不是只停留在判断或拆解层。',
          },
        ],
        quickPrompts: ['Planning 和 Reasoning 差在哪', '为什么执行反馈很重要', '长任务为什么需要显式计划'],
      },
      {
        subject: 'ai-agent-engineering',
        lessonSlug: 'multi-agent-collaboration',
        title: 'Multi-Agent、并发、协作',
        description: '从单代理走到多代理，理解任务切分、并发执行和汇总整合在什么场景下真的有价值。',
        order: 10,
        estimatedMinutes: 12,
        objectives: [
          '理解多代理系统的核心价值在于任务拆分和并发推进',
          '知道什么时候适合多代理，什么时候会只增加复杂度',
          '理解主代理、子代理、汇总层之间的关系',
        ],
        keywords: ['Multi-Agent', 'Parallelism', 'Coordination', 'Subagent', 'Delegation', 'Orchestration'],
        chatContextSummary: '本课讲解多代理协作的价值、边界和典型结构，重点解释为什么并发不等于随便多开几个代理。',
        relatedLessonSlugs: ['planning-reasoning-execution', 'workflow-vs-agent', 'guardrails-evals-observability'],
        animation: 'workflow-vs-agent',
        heroSummary: '多代理真正有价值的时候，是任务可以拆、彼此相对独立、汇总层清晰；否则它只会把复杂度翻倍。',
        sections: [
          {
            title: '多代理为什么会有吸引力',
            paragraphs: [
              '因为很多任务天然可以拆分，例如一个代理做研究，一个代理做实现，一个代理做审查，一个代理做汇总。这种情况下，并发可以换时间。',
              '尤其在信息收集、代码分区修改、内容切片生成等场景，多代理往往能明显提速。',
            ],
          },
          {
            title: '什么时候不该用多代理',
            paragraphs: [
              '如果任务本身强耦合、所有步骤都依赖同一份持续变化的上下文，那么多代理反而会增加同步成本和整合成本。',
              '并发不是免费午餐。每多一个代理，你就多了一次协同、冲突和汇总的成本。',
            ],
          },
          {
            title: '主代理和子代理如何分工',
            paragraphs: [
              '主代理更像调度者：负责理解目标、拆任务、分配边界、回收结果并整合。子代理更像执行单元：只在自己负责的范围内完成具体子任务。',
              '所以一个多代理系统的核心不只是“代理数量”，而是拆分是否合理、边界是否清晰、汇总是否有序。',
            ],
          },
        ],
        misconceptions: [
          {
            myth: '多代理一定比单代理更强。',
            clarification: '如果任务拆不干净，多代理很可能只是制造更多同步和冲突问题。',
          },
          {
            myth: '并发就是同时开更多代理，不需要额外设计。',
            clarification: '真正有效的并发依赖明确的任务边界、结果格式和整合机制。',
          },
        ],
        quiz: [
          {
            question: '下面哪种情况最适合尝试多代理并行？',
            options: ['所有步骤必须共享同一份实时上下文', '研究、实现、审查可以相对独立拆开', '整个任务只有一步固定流程', '任务结果不需要整合'],
            answerIndex: 1,
            explanation: '当研究、实现、审查等子任务可以相对独立推进时，多代理并发才真正有价值。',
          },
        ],
        quickPrompts: ['并发和多代理是一个意思吗', '什么时候别用多代理', '主代理和子代理怎么分工'],
      },
      {
        subject: 'ai-agent-engineering',
        lessonSlug: 'guardrails-evals-observability',
        title: 'Guardrails、权限、评测、可观测性',
        description: '从“让系统可用”走到“让系统可控”，理解为什么防护、评测和观测是 AI 工程的后半场。',
        order: 11,
        estimatedMinutes: 13,
        objectives: [
          '理解 Guardrails、权限控制、评测和可观测性分别解决什么问题',
          '知道为什么只看最终输出不够，必须看中间链路',
          '建立生成前、生成中、生成后的治理视角',
        ],
        keywords: ['Guardrails', 'Permissions', 'Evals', 'Observability', 'Monitoring', 'Retry', 'Fallback'],
        chatContextSummary: '本课聚焦 AI 系统的治理层：生成前约束、执行中权限控制、结果评测、日志与可观测性，以及失败后的重试与回退。',
        relatedLessonSlugs: ['rag-knowledge-retrieval', 'multi-agent-collaboration', 'agent-landscape'],
        animation: 'guardrails-observability',
        heroSummary: '真正可上线的 AI 系统，不只是“偶尔答得很惊艳”，而是“出了问题你知道为什么、能拦、能测、能回退”。',
        sections: [
          {
            title: 'Guardrails 关注的是别跑偏',
            paragraphs: [
              'Guardrails 可以发生在任务开始前、执行过程中和结果输出后。例如敏感操作要不要二次确认、某些参数范围要不要约束、某些结果格式要不要校验，都属于 Guardrails 的范畴。',
              '它关注的不是让模型更聪明，而是让系统别轻易越界。',
            ],
          },
          {
            title: 'Evals 和 Observability 为什么不能少',
            paragraphs: [
              '如果你只看最终回答对不对，却看不到它用了哪些资料、调用了哪些工具、在哪一步失败、为什么回退，那系统一旦不稳就很难诊断。',
              'Evals 让你能系统性测质量，Observability 让你能在运行中看见链路。',
            ],
          },
          {
            title: '权限、重试和回退是上线层思维',
            paragraphs: [
              '真正的工程系统不能假设每次都成功，所以要考虑权限边界、失败后的重试策略、彻底失败后的回退方案。',
              '这类设计往往不显眼，但决定了系统能不能从演示走向稳定使用。',
            ],
          },
        ],
        misconceptions: [
          {
            myth: '只要模型能力够强，Guardrails 和 Evals 可以后面再补。',
            clarification: '如果一开始不考虑治理，后期补救会非常痛苦，尤其当系统已经接了真实用户和真实工具之后。',
          },
          {
            myth: '可观测性只是运维层的事，和 AI 产品体验无关。',
            clarification: 'AI 系统的问题很多发生在中间链路，可观测性直接决定你是否能快速定位质量和行为问题。',
          },
        ],
        quiz: [
          {
            question: '下面哪项最适合归入 Observability？',
            options: ['记录系统调用了哪些工具、花了多久、在哪一步失败', '只改系统提示词', '把所有数据都删掉', '增加更多营销文案'],
            answerIndex: 0,
            explanation: 'Observability 的重点是让系统运行链路可见，便于排障、评测和治理。',
          },
        ],
        quickPrompts: ['Guardrails、Evals、Observability 分别管什么', '为什么上线系统一定要考虑权限和回退', '怎么理解生成前中后的防线'],
      },
    ],
  },
  reverseEngineeringSubject,
];
