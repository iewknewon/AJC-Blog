export type LearningSubjectSlug =
  | 'networking'
  | 'computer-organization'
  | 'ai-agent-engineering'
  | 'reverse-engineering'
  | (string & {});

export type LearningAnimationKind =
  | 'protocol-stack'
  | 'http-lifecycle'
  | 'tcp-flow'
  | 'system-architecture'
  | 'instruction-cycle'
  | 'cache-locality'
  | 'ai-agent-landscape'
  | 'skill-tool-function'
  | 'mcp-flow'
  | 'workflow-vs-agent'
  | 'memory-context'
  | 'rag-pipeline'
  | 'guardrails-observability'
  | 'reverse-landscape'
  | 'pe-anatomy'
  | 'register-flow'
  | 'debugger-flow'
  | 'memory-stack-frame'
  | 'reverse-case-trace';

export type LearningConceptOverview = {
  title: string;
  summary: string;
  pillars: string[];
  safetyNotes: string[];
};

export type LearningLessonSection = {
  title: string;
  paragraphs: string[];
};

export type LearningMisconception = {
  myth: string;
  clarification: string;
};

export type LearningQuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type LearningLesson = {
  subject: LearningSubjectSlug;
  lessonSlug: string;
  title: string;
  description: string;
  order: number;
  estimatedMinutes: number;
  objectives: string[];
  keywords: string[];
  chatContextSummary: string;
  relatedLessonSlugs: string[];
  animation: LearningAnimationKind;
  heroSummary: string;
  sections: LearningLessonSection[];
  misconceptions: LearningMisconception[];
  quiz: LearningQuizQuestion[];
  quickPrompts: string[];
};

export type LearningSubject = {
  slug: LearningSubjectSlug;
  title: string;
  shortTitle: string;
  description: string;
  eyebrow: string;
  colorToken: string;
  icon: string;
  pageVariant?: 'default' | 'timeline';
  conceptOverview?: LearningConceptOverview;
  learningPath: string[];
  lessons: LearningLesson[];
};
