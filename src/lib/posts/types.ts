export type PostStatus = 'draft' | 'published';

export type PostRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  tags: string;
  cover: string | null;
  featured: number;
  status: PostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  cover?: string;
  featured: boolean;
  status: PostStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UpsertPostInput = {
  slug: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  cover?: string | null;
  featured: boolean;
  status: PostStatus;
  publishedAt?: string | null;
};

export type NormalizedPostInput = {
  slug: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  cover: string | null;
  featured: 0 | 1;
  status: PostStatus;
  publishedAt: string | null;
};
