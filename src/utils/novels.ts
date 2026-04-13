import { renderMarkdown, type MarkdownHeading } from '../lib/posts/markdown';
import type {
  PublishedNovelChapter,
  PublishedNovelChapterSummary,
} from '../lib/novels/types';

export type RenderedNovelChapter = PublishedNovelChapter & {
  html: string;
  headings: MarkdownHeading[];
  plainText: string;
};

export function getNovelUrl(projectSlug: string) {
  return `/novels/${projectSlug}/`;
}

export function getNovelChapterUrl(projectSlug: string, volumeNumber: number, chapterNumber: number) {
  return `/novels/${projectSlug}/volume/${volumeNumber}/chapter/${chapterNumber}/`;
}

export function getNovelChapterLabel(volumeNumber: number, chapterNumber: number) {
  return `第 ${volumeNumber} 卷 · 第 ${chapterNumber} 章`;
}

export function groupNovelChaptersByVolume(chapters: PublishedNovelChapterSummary[]) {
  const volumeMap = new Map<number, PublishedNovelChapterSummary[]>();

  for (const chapter of chapters) {
    const existing = volumeMap.get(chapter.volumeNumber) ?? [];
    existing.push(chapter);
    volumeMap.set(chapter.volumeNumber, existing);
  }

  return [...volumeMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([volumeNumber, items]) => ({
      volumeNumber,
      chapters: items.sort((a, b) => a.chapterNumber - b.chapterNumber),
    }));
}

export function getAdjacentNovelChapters(
  chapters: PublishedNovelChapterSummary[],
  volumeNumber: number,
  chapterNumber: number,
) {
  const index = chapters.findIndex((item) =>
    item.volumeNumber === volumeNumber && item.chapterNumber === chapterNumber);

  return {
    previous: index > 0 ? chapters[index - 1] : undefined,
    next: index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : undefined,
  };
}

export async function renderNovelChapter(chapter: PublishedNovelChapter): Promise<RenderedNovelChapter> {
  const rendered = await renderMarkdown(chapter.post.content);

  return {
    ...chapter,
    ...rendered,
  };
}
