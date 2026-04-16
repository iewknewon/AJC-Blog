import { brandCopy } from '../lib/site/brand-copy';

const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? 'https://gisgis.eu.cc';
const contactEmail = import.meta.env.PUBLIC_CONTACT_EMAIL ?? 'hello@gisgis.eu.cc';
const githubUrl = import.meta.env.PUBLIC_GITHUB_URL ?? 'https://github.com/iewknewon';

export const navigation = [
  { label: '首页', href: '/' },
  { label: '归档', href: '/archive' },
  { label: '连载', href: '/novels' },
  { label: '学习', href: '/learn' },
  { label: '标签', href: '/tags' },
  { label: '项目', href: '/projects' },
  { label: '搜索', href: '/search' },
  { label: '关于', href: '/about' },
  { label: '联系', href: '/contact' },
];

export const siteConfig = {
  title: 'AJC 博客',
  description: 'AJC 的技术博客与个人主页，聚合文章、项目、学习内容与持续更新的实践记录。',
  keywords: ['AJC 博客', '技术博客', 'Astro', 'Cloudflare Pages', 'Markdown', '项目展示', '学习中心'],
  siteUrl,
  author: 'AJC',
  brand: brandCopy,
  hero: {
    eyebrow: 'AJC · 技术博客 · 项目实践',
    title: '你好，这里是 AJC。',
    subtitle:
      '这里记录 AJC 的技术学习、项目实践、部署经验、长篇连载与公开学习内容，也作为个人内容与作品的统一入口。',
    ctaPrimary: {
      label: '查看最新文章',
      href: '#latest-posts',
    },
    ctaSecondary: {
      label: '了解 AJC',
      href: '/about',
    },
  },
  about: {
    summary:
      'AJC 专注于个人项目实践、Web 开发体验和可长期维护的内容站点，希望把学习、输出与作品展示沉淀到同一个稳定入口里。',
    paragraphs: [
      '这个网站的第一版重点是把内容表达做好：文章清晰、页面轻快、结构稳定，并且能稳定部署在 Cloudflare 上。',
      '当前站点采用 Astro、Markdown 和 Cloudflare Pages 组合，尽量降低维护成本，同时保留足够好的写作和展示体验。',
      '后续会继续围绕文章内容、项目沉淀、学习中心和站点体验逐步迭代，让它成为 AJC 长期使用的个人博客与主页。',
    ],
  },
  techStack: ['Astro', 'TypeScript', 'Markdown', 'Cloudflare Pages', 'CSS'],
  contact: {
    email: contactEmail,
    github: githubUrl,
  },
  footer: '© 2026 AJC. 使用 Astro 与 Cloudflare Pages 构建。',
};
