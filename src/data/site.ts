const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? 'https://example.com';
const contactEmail = import.meta.env.PUBLIC_CONTACT_EMAIL ?? 'hello@example.com';
const githubUrl = import.meta.env.PUBLIC_GITHUB_URL ?? 'https://github.com/example';

export const navigation = [
  { label: '首页', href: '/' },
  { label: '归档', href: '/archive' },
  { label: '标签', href: '/tags' },
  { label: '关于', href: '/about' },
  { label: '联系', href: '/contact' },
];

export const siteConfig = {
  title: 'Why 的个人博客',
  description: '一个部署在 Cloudflare Pages 上的技术博客与个人主页。',
  siteUrl,
  author: 'Why',
  hero: {
    eyebrow: '个人博客 · 技术写作 · 项目展示',
    title: '你好，我是 Why。',
    subtitle:
      '这里记录我的技术学习、项目实践和思考总结，也展示我正在做的事情与长期积累。',
    ctaPrimary: {
      label: '查看最新文章',
      href: '#latest-posts',
    },
    ctaSecondary: {
      label: '了解我',
      href: '/about',
    },
  },
  about: {
    summary:
      '我专注于前端工程化、Web 体验和个人项目实践，希望通过博客持续沉淀知识并建立清晰的个人品牌表达。',
    paragraphs: [
      '这个网站的第一版重点是把内容表达做好：文章清晰、页面轻快、结构稳定。',
      '我更关注长期维护性，因此选择 Astro + Markdown + Cloudflare Pages 的组合，让写作和部署都更轻量。',
      '后续如果需要，我会在这个基础上继续增加更丰富的交互能力，但不会破坏当前简洁的内容结构。',
    ],
  },
  techStack: ['Astro', 'TypeScript', 'Markdown', 'Cloudflare Pages', 'CSS'],
  contact: {
    email: contactEmail,
    github: githubUrl,
  },
  footer: '© 2026 Why. 使用 Astro 与 Cloudflare Pages 构建。',
};

