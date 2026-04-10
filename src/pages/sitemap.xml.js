import { siteConfig } from '../data/site';
import { getAllTags, getPublishedPosts, paginatePosts } from '../utils/posts';
import { projects } from '../data/projects';

export async function GET() {
  const posts = await getPublishedPosts();
  const tags = await getAllTags();
  const pagination = paginatePosts(posts, 1);

  const urls = [
    '/',
    '/archive',
    '/tags',
    '/projects',
    '/about',
    '/contact',
    '/search',
    '/rss.xml',
    ...posts.map((post) => `/blog/${post.slug}/`),
    ...tags.map((tag) => `/tags/${encodeURIComponent(tag.name)}/`),
    ...projects.map((project) => `/projects/${project.slug}/`),
    ...Array.from({ length: Math.max(0, pagination.totalPages - 1) }, (_, index) => `/archive/page/${index + 2}`),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((path) => `  <url><loc>${new URL(path, siteConfig.siteUrl).toString()}</loc></url>`)
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
