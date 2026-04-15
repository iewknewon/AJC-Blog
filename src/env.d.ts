/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

interface CloudflareRuntimeEnv {
  DB: D1Database;
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
  LEARNING_AI_BASE_URL?: string;
  LEARNING_AI_API_KEY?: string;
  LEARNING_AI_MODEL?: string;
  PUBLIC_SITE_URL?: string;
  PUBLIC_CONTACT_EMAIL?: string;
  PUBLIC_GITHUB_URL?: string;
}

interface ImportMetaEnv {
  readonly DB: D1Database;
  readonly ADMIN_PASSWORD: string;
  readonly SESSION_SECRET: string;
  readonly LEARNING_AI_BASE_URL?: string;
  readonly LEARNING_AI_API_KEY?: string;
  readonly LEARNING_AI_MODEL?: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_CONTACT_EMAIL?: string;
  readonly PUBLIC_GITHUB_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
