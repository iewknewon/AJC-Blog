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
];
