export type Project = {
  slug: string;
  title: string;
  description: string;
  techStack: string[];
  cover?: string;
  highlights: string[];
  demoUrl?: string;
  repoUrl?: string;
  featured: boolean;
};

export const projects: Project[] = [
  {
    slug: 'cloudflare-blog-starter',
    title: 'Cloudflare 博客模板',
    description: '一个适合个人博客和知识沉淀的静态站点模板，强调轻量、清晰和快速部署。',
    techStack: ['Astro', 'TypeScript', 'Cloudflare Pages'],
    highlights: ['支持 Markdown 写作', '支持标签与归档', '支持深色模式'],
    demoUrl: 'https://example.com',
    repoUrl: 'https://github.com/example/cloudflare-blog-starter',
    featured: true,
  },
  {
    slug: 'developer-dashboard',
    title: '开发者数据面板',
    description: '一个用于聚合个人项目状态与文章统计信息的可视化面板。',
    techStack: ['Astro', 'Charting', 'Cloudflare'],
    highlights: ['统一展示内容入口', '强调响应式布局', '适合个人站点扩展'],
    demoUrl: 'https://example.com/dashboard',
    repoUrl: 'https://github.com/example/developer-dashboard',
    featured: true,
  },
  {
    slug: 'markdown-notes-lab',
    title: 'Markdown 笔记实验室',
    description: '一个围绕知识管理和写作体验展开的小型实验项目。',
    techStack: ['Markdown', 'Astro', 'CSS'],
    highlights: ['专注写作体验', '结构简洁', '便于长期维护'],
    repoUrl: 'https://github.com/example/markdown-notes-lab',
    featured: false,
  },
];
