import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLearningChatPrompt,
  getLearningChatRateLimit,
  trimLearningChatMessages,
} from './chat';

test('trimLearningChatMessages keeps only valid recent messages', () => {
  const messages = trimLearningChatMessages([
    { role: 'user', content: 'What is TCP?' },
    { role: 'assistant', content: 'TCP is a reliable transport protocol.' },
    { role: 'system', content: 'ignored' },
    null,
  ]);

  assert.equal(messages.length, 2);
  assert.equal(messages[0]?.role, 'user');
  assert.equal(messages[1]?.role, 'assistant');
});

test('buildLearningChatPrompt binds responses to the current lesson', () => {
  const prompt = buildLearningChatPrompt({
    subject: 'networking',
    lessonSlug: 'protocol-stack',
    messages: [
      { role: 'user', content: 'Explain the protocol stack simply.' },
    ],
  });

  assert.match(prompt, /Track:/);
  assert.match(prompt, /Lesson:/);
  assert.match(prompt, /Objectives:/);
  assert.match(prompt, /Conversation:/);
});

test('getLearningChatRateLimit counts hourly and daily usage', async () => {
  const db = {
    async batch() {
      return [];
    },
    prepare() {
      return {
        bind() {
          return {
            async first() {
              return {
                hourly_count: 4,
                daily_count: 12,
              };
            },
          };
        },
        async run() {
          return { success: true };
        },
      };
    },
  } as unknown as D1Database;

  const rateLimit = await getLearningChatRateLimit(db, 'ip-hash');

  assert.equal(rateLimit.hourlyCount, 4);
  assert.equal(rateLimit.dailyCount, 12);
  assert.equal(rateLimit.allowed, true);
});
