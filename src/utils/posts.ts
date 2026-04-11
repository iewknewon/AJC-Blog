import { renderMarkdown, type MarkdownHeading } from '../lib/posts/markdown';
import {
  getPublishedPostBySlug as getPublishedPostBySlugFromRepository,
  getPublishedPosts as getPublishedPostsFromRepository,
} from '../lib/posts/repository';
import type { BlogPost } from '../lib/posts/types';

export const POSTS_PER_PAGE = 6;

export type TagSummary = {
  name: string;
  count: number;
};

export type PaginationResult<T> = {
  items: T[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
};

export type RenderedPost = BlogPost & {
  html: string;
  headings: MarkdownHeading[];
  plainText: string;
};

export async function getPublishedPosts(db: D1Database) {
  return getPublishedPostsFromRepository(db);
}

export async function getPublishedPostBySlug(db: D1Database, slug: string) {
  return getPublishedPostBySlugFromRepository(db, slug);
}

export function getFeaturedPostsFromPosts(posts: BlogPost[]) {
  return posts.filter((post) => post.featured);
}

export async function getFeaturedPosts(db: D1Database) {
  return getFeaturedPostsFromPosts(await getPublishedPosts(db));
}

export function getLatestPostsFromPosts(posts: BlogPost[], limit?: number) {
  return typeof limit === 'number' ? posts.slice(0, limit) : posts;
}

export async function getLatestPosts(db: D1Database, limit?: number) {
  return getLatestPostsFromPosts(await getPublishedPosts(db), limit);
}

export function getAllTagsFromPosts(posts: BlogPost[]): TagSummary[] {
  const tagMap = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.tags) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }

  return [...tagMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

export async function getAllTags(db: D1Database) {
  return getAllTagsFromPosts(await getPublishedPosts(db));
}

export function getPostsByTagFromPosts(posts: BlogPost[], tag: string) {
  const normalizedTag = tag.trim().toLowerCase();
  return posts.filter((post) => post.tags.some((item) => item.toLowerCase() === normalizedTag));
}

export async function getPostsByTag(db: D1Database, tag: string) {
  return getPostsByTagFromPosts(await getPublishedPosts(db), tag);
}

export function searchPostsFromPosts(posts: BlogPost[], keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return [];
  }

  return posts.filter((post) => {
    const searchableText = [post.title, post.description, ...post.tags, post.content].join(' ').toLowerCase();
    return searchableText.includes(normalizedKeyword);
  });
}

export async function searchPosts(db: D1Database, keyword: string) {
  return searchPostsFromPosts(await getPublishedPosts(db), keyword);
}

export function paginatePosts<T>(posts: T[], page: number, pageSize = POSTS_PER_PAGE): PaginationResult<T> {
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

export function getAdjacentPosts(posts: BlogPost[], slug: string) {
  const index = posts.findIndex((post) => post.slug === slug);

  return {
    previous: index < posts.length - 1 ? posts[index + 1] : undefined,
    next: index > 0 ? posts[index - 1] : undefined,
  };
}

export async function renderPost(post: BlogPost): Promise<RenderedPost> {
  const rendered = await renderMarkdown(post.content);
  return {
    ...post,
    ...rendered,
  };
}

export function getCanonicalUrl(pathname: string, siteUrl: string) {
  return new URL(pathname, siteUrl).toString();
}
