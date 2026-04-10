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
    slug: 'ajc-blog',
    title: 'AJC 博客',
    description: 'AJC 当前正在运行的个人博客站点，面向文章写作、项目展示和 Cloudflare 部署实践。',
    techStack: ['Astro', 'TypeScript', 'Cloudflare Pages'],
    highlights: ['支持 Markdown 写作', '支持标签与归档', '支持深色模式'],
    demoUrl: 'https://gisgis.eu.cc',
    repoUrl: 'https://github.com/iewknewon/AJC-Blog',
    featured: true,
  },
  {
    slug: 'developer-dashboard',
    title: '内容与项目总览面板',
    description: '围绕文章更新、项目入口和站点信息组织的一套内容导航面板设计。',
    techStack: ['Astro', 'TypeScript', 'Cloudflare'],
    highlights: ['强化内容入口组织', '适合个人站点扩展', '强调响应式布局'],
    demoUrl: 'https://gisgis.eu.cc/projects',
    repoUrl: 'https://github.com/iewknewon/AJC-Blog',
    featured: true,
  },
  {
    slug: 'markdown-notes-lab',
    title: 'Markdown 内容工作流',
    description: '围绕写作、整理、发布与归档而设计的个人内容工作流实践。',
    techStack: ['Markdown', 'Astro', 'CSS'],
    highlights: ['专注长期写作', '结构轻量清晰', '便于后续持续维护'],
    demoUrl: 'https://gisgis.eu.cc/archive',
    repoUrl: 'https://github.com/iewknewon/AJC-Blog',
    featured: false,
  },
];
