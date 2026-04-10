import { getCollection, type CollectionEntry } from 'astro:content';

export const POSTS_PER_PAGE = 6;

export async function getPublishedPosts() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

export async function getFeaturedPosts() {
  const posts = await getPublishedPosts();
  return posts.filter((post) => post.data.featured);
}

export async function getLatestPosts(limit?: number) {
  const posts = await getPublishedPosts();
  return typeof limit === 'number' ? posts.slice(0, limit) : posts;
}

export async function getAllTags() {
  const posts = await getPublishedPosts();
  const tagMap = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.data.tags) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }

  return [...tagMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

export async function getPostsByTag(tag: string) {
  const posts = await getPublishedPosts();
  return posts.filter((post) => post.data.tags.includes(tag));
}

export async function searchPosts(keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return [];
  }

  const posts = await getPublishedPosts();

  return posts.filter((post) => {
    const searchableText = [post.data.title, post.data.description, ...post.data.tags, post.body]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedKeyword);
  });
}

export function paginatePosts(posts: CollectionEntry<'blog'>[], page: number, pageSize = POSTS_PER_PAGE) {
  const totalPages = Math.max(1, Math.ceil(posts.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    items: posts.slice(start, start + pageSize),
    currentPage,
    totalPages,
    pageSize,
    totalItems: posts.length,
  };
}

export function getAdjacentPosts(posts: CollectionEntry<'blog'>[], slug: string) {
  const index = posts.findIndex((post) => post.slug === slug);

  return {
    previous: index < posts.length - 1 ? posts[index + 1] : undefined,
    next: index > 0 ? posts[index - 1] : undefined,
  };
}

export function getCanonicalUrl(pathname: string, siteUrl: string) {
  return new URL(pathname, siteUrl).toString();
}
