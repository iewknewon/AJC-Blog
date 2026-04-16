import { siteConfig } from '../data/site';
import { getAllTags, getPublishedPosts, paginatePosts } from '../utils/posts';
import { getMergedAllLearningLessons, getMergedLearningSubjects } from '../lib/learning/content';
import {
  getPublishedNovelChapterSummariesByProjectId,
  getPublishedNovelProjects,
} from '../lib/novels/repository';
import { projects } from '../data/projects';
import { getNovelChapterUrl, getNovelUrl } from '../utils/novels';

export async function GET(context) {
  const db = context.locals.runtime?.env?.DB;
  const posts = db ? await getPublishedPosts(db) : [];
  const tags = db ? await getAllTags(db) : [];
  const pagination = paginatePosts(posts, 1);
  const novels = db ? await getPublishedNovelProjects(db) : [];
  const novelChapters = db
    ? await Promise.all(
      novels.map(async (novel) => ({
        novel,
        chapters: await getPublishedNovelChapterSummariesByProjectId(db, novel.id),
      })),
    )
    : [];
  const learningSubjects = await getMergedLearningSubjects(db);
  const learningLessons = await getMergedAllLearningLessons(db);

  const urls = [
    '/',
    '/archive',
    '/novels',
    '/learn',
    '/tags',
    '/projects',
    '/about',
    '/contact',
    '/search',
    '/rss.xml',
    ...posts.map((post) => `/blog/${post.slug}/`),
    ...novels.map((novel) => getNovelUrl(novel.slug)),
    ...learningSubjects.map((subject) => `/learn/${subject.slug}`),
    ...learningLessons.map((lesson) => lesson.href),
    ...novelChapters.flatMap(({ novel, chapters }) =>
      chapters.map((chapter) => getNovelChapterUrl(novel.slug, chapter.volumeNumber, chapter.chapterNumber))),
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
