import type { PostStatus } from '../posts/types';

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
