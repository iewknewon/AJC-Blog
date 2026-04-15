export type LearningSubjectSlug = 'networking' | 'computer-organization';

export type LearningAnimationKind =
  | 'protocol-stack'
  | 'http-lifecycle'
  | 'tcp-flow'
  | 'system-architecture'
  | 'instruction-cycle'
  | 'cache-locality';

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
  learningPath: string[];
  lessons: LearningLesson[];
};
