import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));

function readSource(relativePath: string) {
  return readFileSync(resolve(currentDir, relativePath), 'utf8');
}

test('subject page supports the timeline variant for reverse-engineering', () => {
  const source = readSource('../../pages/learn/[subject].astro');

  assert.match(source, /pageVariant\s*===\s*'timeline'/);
  assert.match(source, /learning-timeline-axis/);
  assert.match(source, /conceptOverview/);
});

test('learning visual switcher exposes reverse-engineering visual kinds', () => {
  const source = readSource('../../components/learning/LearningVisual.astro');

  [
    'reverse-landscape',
    'pe-anatomy',
    'register-flow',
    'debugger-flow',
    'memory-stack-frame',
    'reverse-case-trace',
  ].forEach((kind) => {
    assert.match(source, new RegExp(kind));
  });
});

test('learning-center source files no longer contain known mojibake markers', () => {
  const mojibakePattern = /瀛︿範|鍏紑|杩斿洖|鐩存帴寮|璇炬椂|鍥捐В|鏈|璇惧唴|甯歌|鍏抽敭璇?/;
  const files = [
    '../../pages/learn/index.astro',
    '../../pages/learn/[subject].astro',
    '../../pages/learn/[subject]/[lesson].astro',
    '../../components/LearningSection.astro',
    '../../components/learning/LearningSubjectCard.astro',
    '../../components/learning/LearningLessonCard.astro',
    '../../components/learning/LearningChat.astro',
  ];

  files.forEach((relativePath) => {
    const source = readSource(relativePath);
    assert.doesNotMatch(source, mojibakePattern, relativePath);
  });
});
