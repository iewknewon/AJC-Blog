export function listMarkdownFiles(entries: string[]) {
  return entries
    .filter((entry) => entry.toLowerCase().endsWith('.md'))
    .sort((a, b) => a.localeCompare(b));
}

export function getSeedModeFlag(argv: string[]) {
  return argv.includes('--remote') ? '--remote' : '--local';
}

export function getWranglerExecutable(platform: NodeJS.Platform) {
  return platform === 'win32' ? 'npx.cmd' : 'npx';
}

export function getWranglerCommand(platform: NodeJS.Platform) {
  if (platform === 'win32') {
    return ['node', './node_modules/wrangler/bin/wrangler.js'];
  }

  return [getWranglerExecutable(platform), 'wrangler'];
}

function toSqlLiteral(value: string | null) {
  if (value === null) {
    return 'NULL';
  }

  return `'${value.replace(/'/g, "''")}'`;
}

export function buildPostSeedSql(input: {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  cover: string | null;
  featured: boolean;
  status: 'draft' | 'published';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}) {
  return `INSERT OR REPLACE INTO posts (id, slug, title, description, content, tags, cover, featured, status, published_at, created_at, updated_at)
VALUES (${toSqlLiteral(input.id)}, ${toSqlLiteral(input.slug)}, ${toSqlLiteral(input.title)}, ${toSqlLiteral(input.description)}, ${toSqlLiteral(input.content)}, ${toSqlLiteral(JSON.stringify(input.tags))}, ${toSqlLiteral(input.cover)}, ${input.featured ? 1 : 0}, ${toSqlLiteral(input.status)}, ${toSqlLiteral(input.publishedAt)}, ${toSqlLiteral(input.createdAt)}, ${toSqlLiteral(input.updatedAt)});`;
}

export function getWranglerExecuteArgs(modeFlag: '--local' | '--remote', sqlFilePath: string) {
  return ['d1', 'execute', 'DB', modeFlag, '--file', sqlFilePath];
}
