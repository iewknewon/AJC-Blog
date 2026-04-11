import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPostSeedSql, getSeedModeFlag, getWranglerCommand, getWranglerExecutable, getWranglerExecuteArgs, listMarkdownFiles } from './seed';

test('listMarkdownFiles 只返回 markdown 文件并按文件名排序', () => {
  const files = listMarkdownFiles([
    'b.md',
    'a.md',
    'note.txt',
    'draft.mdx',
    'z.md',
  ]);

  assert.deepEqual(files, ['a.md', 'b.md', 'z.md']);
});

test('getSeedModeFlag 在传入 --remote 时返回远程模式', () => {
  assert.equal(getSeedModeFlag(['--remote']), '--remote');
});

test('getSeedModeFlag 默认返回本地模式', () => {
  assert.equal(getSeedModeFlag([]), '--local');
});

test('getWranglerExecutable 在 Windows 上返回 npx.cmd', () => {
  assert.equal(getWranglerExecutable('win32'), 'npx.cmd');
});

test('getWranglerExecutable 在非 Windows 上返回 npx', () => {
  assert.equal(getWranglerExecutable('linux'), 'npx');
});

test('getWranglerCommand 在 Windows 上返回 node + 本地 wrangler 入口', () => {
  assert.deepEqual(getWranglerCommand('win32'), ['node', './node_modules/wrangler/bin/wrangler.js']);
});

test('getWranglerCommand 在非 Windows 上返回 npx wrangler', () => {
  assert.deepEqual(getWranglerCommand('linux'), ['npx', 'wrangler']);
});

test('buildPostSeedSql 会安全转义包含中文标签和引号的内容', () => {
  const sql = buildPostSeedSql({
    id: 'id-1',
    slug: 'post-1',
    title: '标题',
    description: '描述',
    content: '正文里有标签数组 ["性能","部署"] 和引号 "test"',
    tags: ['性能', '部署'],
    cover: null,
    featured: false,
    status: 'published',
    publishedAt: '2026-04-10T00:00:00.000Z',
    createdAt: '2026-04-10T00:00:00.000Z',
    updatedAt: '2026-04-10T00:00:00.000Z',
  });

  assert.match(sql, /VALUES \('id-1'/);
  assert.match(sql, /'正文里有标签数组 \["性能","部署"\] 和引号 "test"'/);
  assert.match(sql, /'\["性能","部署"\]'/);
});

test('getWranglerExecuteArgs 返回基于 SQL 文件的执行参数', () => {
  assert.deepEqual(getWranglerExecuteArgs('--remote', 'C:/temp/post.sql'), [
    'd1',
    'execute',
    'DB',
    '--remote',
    '--file',
    'C:/temp/post.sql',
  ]);
});
