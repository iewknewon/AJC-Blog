import type { LearningSubjectSlug } from './types';
import type { LearningStageSlug } from '../../lib/learning/types';

export type LearningStageDefinition = {
  slug: LearningStageSlug;
  title: string;
  description: string;
  order: number;
};

export const learningStages: LearningStageDefinition[] = [
  {
    slug: 'getting-started',
    title: '入门',
    description: '先建立方向感，知道这条学习线在解决什么问题、会经过哪些阶段。',
    order: 1,
  },
  {
    slug: 'fundamentals',
    title: '基础',
    description: '把核心概念、关键术语和底层模型讲扎实，后续专题才不会悬空。',
    order: 2,
  },
  {
    slug: 'advanced',
    title: '进阶',
    description: '开始进入系统化理解，把多个知识点连成完整的方法链路。',
    order: 3,
  },
  {
    slug: 'special-topics',
    title: '专题',
    description: '围绕一个明确主题展开，适合做成持续更新的系列学习线。',
    order: 4,
  },
  {
    slug: 'practicum',
    title: '实战',
    description: '把前面的知识落到真实案例、练习任务和完整项目里。',
    order: 5,
  },
] as const;

export const staticLearningStageMap: Record<string, LearningStageSlug> = {
  networking: 'fundamentals',
  'computer-organization': 'fundamentals',
  'ai-agent-engineering': 'special-topics',
  'reverse-engineering': 'special-topics',
};

export function getStaticLearningStageSlug(subjectSlug: LearningSubjectSlug) {
  return staticLearningStageMap[subjectSlug] ?? 'special-topics';
}
