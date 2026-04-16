import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseLearningLessonDraft,
  parseLearningLessonOutline,
  parseLearningTrackBlueprint,
} from './learning';

test('parseLearningTrackBlueprint normalizes stage slug, slug, and learning path', () => {
  const blueprint = parseLearningTrackBlueprint(`{
    "title": "Token 安全专题",
    "slug": "Token Security",
    "shortTitle": "Token 安全",
    "description": "讲清楚 token、session 和 secret 的关系。",
    "stageSlug": "special-topics",
    "eyebrow": "Learning Track",
    "colorToken": "Security",
    "icon": "tokn",
    "pageVariant": "timeline",
    "learningPath": ["先知道风险", "再理解机制", "最后落到实践"],
    "conceptOverview": {
      "title": "什么是 Token 安全",
      "summary": "从身份、状态与密钥三个角度理解它。",
      "pillars": ["身份", "状态", "密钥"],
      "safetyNotes": ["默认只讨论防御性工程。"]
    }
  }`, '帮我做一个 token 安全学习专题');

  assert.equal(blueprint.slug, 'token-security');
  assert.equal(blueprint.stageSlug, 'special-topics');
  assert.equal(blueprint.pageVariant, 'timeline');
  assert.deepEqual(blueprint.learningPath, ['先知道风险', '再理解机制', '最后落到实践']);
  assert.equal(blueprint.icon, 'TOKN');
  assert.equal(blueprint.sourcePrompt, '帮我做一个 token 安全学习专题');
});

test('parseLearningLessonOutline normalizes lesson order and missing arrays', () => {
  const outline = parseLearningLessonOutline(`{
    "lessons": [
      {
        "lessonSlug": "what-is-token",
        "title": "Token 是什么",
        "description": "先建立整体概念。",
        "order": 9,
        "estimatedMinutes": 15,
        "objectives": ["知道 token 的角色"],
        "keywords": ["token", "身份"],
        "animation": "mcp-flow",
        "heroSummary": "先讲直觉，再讲结构。",
        "chatContextSummary": "围绕 token 基础概念回答。",
        "quickPrompts": ["再通俗一点"]
      },
      {
        "title": "Session 与 Token 的关系",
        "description": "把两者放在同一个视角下比较。",
        "order": 2,
        "estimatedMinutes": 12,
        "animation": "not-a-real-kind"
      }
    ]
  }`, {
    prompt: '做一个 token 安全专题',
    blueprint: parseLearningTrackBlueprint(`{"title":"Token 安全","description":"desc","stageSlug":"special-topics","learningPath":["a","b","c"],"conceptOverview":{"title":"t","summary":"s","pillars":["p"],"safetyNotes":["n"]}}`),
  });

  assert.equal(outline.lessons.length, 2);
  assert.equal(outline.lessons[0]?.order, 1);
  assert.equal(outline.lessons[1]?.order, 2);
  assert.equal(outline.lessons[0]?.animation, 'mcp-flow');
  assert.equal(outline.lessons[1]?.animation, 'workflow-vs-agent');
  assert.ok((outline.lessons[1]?.objectives.length ?? 0) >= 3);
  assert.ok((outline.lessons[1]?.quickPrompts.length ?? 0) >= 4);
  assert.equal(outline.lessons[1]?.lessonSlug, 'session-token');
});

test('parseLearningLessonDraft normalizes sections, quiz, and related lessons', () => {
  const draft = parseLearningLessonDraft(`{
    "sections": [
      {
        "title": "先建立直觉",
        "paragraphs": ["Token 可以先理解成一张可验证的身份凭证。", "它不是万能钥匙，而是一种约定好的状态表达。"]
      },
      {
        "title": "再看它和 Session 的关系",
        "paragraphs": ["两者都在解决状态保持问题，但落点不同。", "一个更偏凭证，一个更偏服务端状态。"]
      },
      {
        "title": "最后放回真实系统",
        "paragraphs": ["如果不知道边界和失效策略，系统就容易出问题。"]
      }
    ],
    "misconceptions": [
      {
        "myth": "Token 天生比 Session 更安全。",
        "clarification": "安全性取决于存储、传输、签发与校验策略。"
      }
    ],
    "quiz": [
      {
        "question": "Token 最常承担什么角色？",
        "options": ["状态凭证", "数据库", "浏览器缓存"],
        "answerIndex": 0,
        "explanation": "它通常承担一种可验证的状态或身份表达。"
      },
      {
        "question": "为什么要关注失效策略？",
        "options": ["因为名字好听", "因为它决定凭证泄漏后的风险窗口"],
        "answerIndex": 1,
        "explanation": "失效窗口过长会扩大泄漏后的影响面。"
      }
    ],
    "relatedLessonSlugs": ["session basics", "token lifecycle"]
  }`, {
    title: 'Token 是什么',
    description: 'desc',
  });

  assert.equal(draft.sections.length, 3);
  assert.equal(draft.quiz.length, 2);
  assert.equal(draft.misconceptions.length, 1);
  assert.deepEqual(draft.relatedLessonSlugs, ['session-basics', 'token-lifecycle']);
});

test('parseLearningLessonDraft falls back when core lesson structure is missing', () => {
  const draft = parseLearningLessonDraft(`{"sections":[],"quiz":[]}`, {
    title: '缓存与局部性',
    description: 'desc',
  });

  assert.ok(draft.sections.length >= 3);
  assert.ok(draft.quiz.length >= 2);
});
