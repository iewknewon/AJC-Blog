import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AI_WRITING_PRESETS,
  DEFAULT_AI_WRITING_PRESET_ID,
  getAiWritingPresetById,
  mergePromptSegments,
} from './presets';

test('getAiWritingPresetById returns the built-in novel-writing preset', () => {
  const preset = getAiWritingPresetById('novel-writing');

  assert.equal(preset.id, 'novel-writing');
  assert.match(preset.label, /小说/);
  assert.ok(preset.customPrompt.length > 20);
  assert.ok(preset.systemPrompt.length > 20);
});

test('getAiWritingPresetById falls back to the default preset', () => {
  const preset = getAiWritingPresetById('unknown-mode');

  assert.equal(preset.id, DEFAULT_AI_WRITING_PRESET_ID);
});

test('mergePromptSegments joins non-empty prompt blocks with spacing', () => {
  const merged = mergePromptSegments('第一段', '', null, '第二段');

  assert.equal(merged, '第一段\n\n第二段');
});

test('AI_WRITING_PRESETS includes at least the default and novel modes', () => {
  const presetIds = AI_WRITING_PRESETS.map((preset) => preset.id);

  assert.deepEqual(presetIds, ['blog-default', 'novel-writing']);
});
