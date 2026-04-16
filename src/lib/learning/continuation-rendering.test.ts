import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));

function readSource(relativePath: string) {
  return readFileSync(resolve(currentDir, relativePath), 'utf8');
}

test('admin learning track page mounts the continuation panel', () => {
  const source = readSource('../../pages/admin/learning/[id].astro');

  assert.match(source, /AdminLearningContinuationPanel/);
  assert.match(source, /<AdminLearningContinuationPanel/);
  assert.match(source, /lessons=\{lessons\}/);
});

test('continuation panel reuses browser AI config keys and stage states', () => {
  const source = readSource('../../components/admin/AdminLearningContinuationPanel.astro');

  [
    'ajc.ai.baseUrl',
    'ajc.ai.apiKey',
    'ajc.ai.model',
    'planning',
    'plan-ready',
    'drafting',
    'partial-failed',
    '/continuation-plan',
    '/continuation-drafts',
  ].forEach((token) => {
    assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});
