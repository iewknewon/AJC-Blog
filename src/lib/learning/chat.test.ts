import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLearningChatPrompt,
  getLearningChatRateLimit,
  trimLearningChatMessages,
} from './chat';

test('trimLearningChatMessages keeps only valid recent messages', () => {
  const messages = trimLearningChatMessages([
    { role: 'user', content: '什么是 TCP？' },
    { role: 'assistant', content: 'TCP 是可靠传输协议。' },
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
      { role: 'user', content: '为什么一定要分层？' },
    ],
  });

  assert.match(prompt, /当前课程：计算机网络/);
  assert.match(prompt, /当前课时：分层模型与协议栈/);
  assert.match(prompt, /只回答与当前课时内容直接相关的问题/);
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
