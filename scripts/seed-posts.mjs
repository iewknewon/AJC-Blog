import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import matter from 'gray-matter';
import { buildPostSeedSql, getSeedModeFlag, getWranglerCommand, getWranglerExecuteArgs, listMarkdownFiles } from '../src/lib/posts/seed.ts';

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'ajc-blog-seed-'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const postsDir = path.join(projectRoot, 'src', 'content', 'blog');
const modeFlag = getSeedModeFlag(process.argv.slice(2));
const [wranglerExecutable, ...wranglerArgs] = getWranglerCommand(process.platform);

const entries = listMarkdownFiles(readdirSync(postsDir)).map((fileName) => path.join(postsDir, fileName));

try {
  for (const filePath of entries) {
    const raw = readFileSync(filePath, 'utf8');
    const { data, content } = matter(raw);
    const slug = path.basename(filePath, '.md');
    const status = data.draft ? 'draft' : 'published';
    const publishedAt = data.draft ? null : new Date(data.pubDate).toISOString();
    const now = new Date().toISOString();
    const sql = buildPostSeedSql({
      id: randomUUID(),
      slug,
      title: data.title,
      description: data.description,
      content: content.trim(),
      tags: data.tags ?? [],
      cover: data.cover ?? null,
      featured: Boolean(data.featured),
      status,
      publishedAt,
      createdAt: publishedAt ?? now,
      updatedAt: now,
    });
    const sqlFilePath = path.join(tempDir, `${slug}.sql`);

    writeFileSync(sqlFilePath, sql, 'utf8');
    execFileSync(wranglerExecutable, [...wranglerArgs, ...getWranglerExecuteArgs(modeFlag, sqlFilePath)], {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

console.log(`Seeded ${entries.length} posts into ${modeFlag === '--remote' ? 'remote' : 'local'} D1.`);
