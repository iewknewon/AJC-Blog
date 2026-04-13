import type { BlogPost, PostStatus } from '../posts/types';

export type NovelProjectStatus = 'planning' | 'serializing' | 'paused' | 'completed';

export type NovelProjectRow = {
  id: string;
  slug: string;
  title: string;
  premise: string;
  genre: string;
  writing_goals: string;
  reference_title: string | null;
  reference_summary: string | null;
  reference_notes: string | null;
  world_bible: string;
  character_bible: string;
  outline: string;
  style_guide: string;
  continuity_notes: string;
  status: NovelProjectStatus;
  created_at: string;
  updated_at: string;
};

export type NovelProjectQueryRow = NovelProjectRow & {
  chapters_count?: unknown;
  last_chapter_number?: unknown;
  last_volume_number?: unknown;
};

export type PublishedNovelProjectQueryRow = NovelProjectQueryRow & {
  latest_published_at?: string | null;
  latest_chapter_title?: string | null;
  cover_image?: string | null;
};

export type NovelProject = {
  id: string;
  slug: string;
  title: string;
  premise: string;
  genre: string;
  writingGoals: string;
  referenceTitle?: string;
  referenceSummary?: string;
  referenceNotes?: string;
  worldBible: string;
  characterBible: string;
  outline: string;
  styleGuide: string;
  continuityNotes: string;
  status: NovelProjectStatus;
  chaptersCount: number;
  lastChapterNumber: number;
  lastVolumeNumber: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PublishedNovelProject = NovelProject & {
  latestPublishedAt: Date | null;
  latestChapterTitle?: string;
  cover?: string;
};

export type UpsertNovelProjectInput = {
  slug: string;
  title: string;
  premise: string;
  genre?: string;
  writingGoals?: string;
  referenceTitle?: string | null;
  referenceSummary?: string | null;
  referenceNotes?: string | null;
  worldBible?: string;
  characterBible?: string;
  outline?: string;
  styleGuide?: string;
  continuityNotes?: string;
  status: NovelProjectStatus;
};

export type NormalizedNovelProjectInput = {
  slug: string;
  title: string;
  premise: string;
  genre: string;
  writingGoals: string;
  referenceTitle: string | null;
  referenceSummary: string | null;
  referenceNotes: string | null;
  worldBible: string;
  characterBible: string;
  outline: string;
  styleGuide: string;
  continuityNotes: string;
  status: NovelProjectStatus;
};

export type NovelReferenceSourceRow = {
  id: string;
  project_id: string;
  title: string;
  url: string;
  snippet: string;
  excerpt: string | null;
  created_at: string;
};

export type NovelReferenceSource = {
  id: string;
  projectId: string;
  title: string;
  url: string;
  snippet: string;
  excerpt?: string;
  createdAt: Date;
};

export type NovelReferenceSourceInput = {
  title: string;
  url: string;
  snippet?: string;
  excerpt?: string;
};

export type NovelChapterRow = {
  id: string;
  project_id: string;
  volume_number: number;
  chapter_number: number;
  title: string;
  description: string;
  brief: string;
  summary: string;
  continuity_delta: string;
  post_id: string | null;
  post_slug: string | null;
  status: PostStatus;
  created_at: string;
  updated_at: string;
};

export type PublishedNovelChapterSummaryQueryRow = NovelChapterRow & {
  post_published_at: string | null;
  post_cover: string | null;
};

export type NovelChapter = {
  id: string;
  projectId: string;
  volumeNumber: number;
  chapterNumber: number;
  title: string;
  description: string;
  brief: string;
  summary: string;
  continuityDelta: string;
  postId?: string;
  postSlug?: string;
  status: PostStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type PublishedNovelChapterSummary = NovelChapter & {
  publishedAt: Date | null;
  cover?: string;
};

export type PublishedNovelChapterQueryRow = PublishedNovelChapterSummaryQueryRow & {
  current_post_slug: string;
  post_title: string;
  post_description: string;
  post_content: string;
  post_tags: string;
  post_featured: number;
  post_status: PostStatus;
  post_created_at: string;
  post_updated_at: string;
};

export type PublishedNovelChapter = PublishedNovelChapterSummary & {
  post: BlogPost;
};

export type CreateNovelChapterInput = {
  projectId: string;
  volumeNumber?: number;
  chapterNumber: number;
  title: string;
  description: string;
  brief?: string;
  summary?: string;
  continuityDelta?: string;
  postId?: string | null;
  postSlug?: string | null;
  status: PostStatus;
};
