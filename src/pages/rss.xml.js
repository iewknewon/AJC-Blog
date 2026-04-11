import rss from '@astrojs/rss';
import { getPublishedPosts, renderPost } from '../utils/posts';
import { siteConfig } from '../data/site';

export async function GET(context) {
  const db = context.locals.runtime.env.DB;
  const posts = await getPublishedPosts(db);
  const renderedPosts = await Promise.all(posts.map((post) => renderPost(post)));

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: context.site ?? siteConfig.siteUrl,
    items: renderedPosts.map((post) => ({
      title: post.title,
      description: post.description,
      pubDate: post.publishedAt ?? post.updatedAt,
      link: `/blog/${post.slug}/`,
      content: post.html,
    })),
  });
}
