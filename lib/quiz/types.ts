export const difficulties = ["easy", "medium", "hard"] as const;
export const requestedQuestionTypes = ["multiple_choice", "true_false", "mixed"] as const;
export const concreteQuestionTypes = ["multiple_choice", "true_false"] as const;
export const questionCounts = [5, 10] as const;
export const timerMinutesOptions = [5, 10, 15, 20, 30] as const;

export type Difficulty = (typeof difficulties)[number];
export type RequestedQuestionType = (typeof requestedQuestionTypes)[number];
export type ConcreteQuestionType = (typeof concreteQuestionTypes)[number];
export type QuestionCount = (typeof questionCounts)[number];
export type TimerMinutes = (typeof timerMinutesOptions)[number];

export type GenerateRequest = {
  topic: string;
  description: string;
  questionCount: QuestionCount;
  difficulty: Difficulty;
  questionType: RequestedQuestionType;
  timerMinutes: TimerMinutes | null;
};

export type QuizQuestion = {
  questionId: string;
  questionText: string;
  questionType: ConcreteQuestionType;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

export type QuizContent = {
  title: string;
  topic: string;
  difficulty: Difficulty;
  questionType: RequestedQuestionType;
  questions: QuizQuestion[];
};

export type StoredQuiz = QuizContent & {
  id: string;
  timerSeconds: number | null;
  createdAt: string;
  fallback?: boolean;
};

export type PublicQuestion = {
  questionId: string;
  questionText: string;
  questionType: ConcreteQuestionType;
  options: string[];
};

export type PublicQuiz = {
  id: string;
  title: string;
  topic: string;
  difficulty: Difficulty;
  questionType: RequestedQuestionType;
  timerSeconds: number | null;
  createdAt: string;
  fallback?: boolean;
  questions: PublicQuestion[];
};

export type ReviewedQuestion = PublicQuestion & {
  correctAnswer: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
  explanation: string;
};

export type QuizResult = {
  attemptId: string;
  quizId: string;
  title: string;
  topic: string;
  difficulty: Difficulty;
  questionType: RequestedQuestionType;
  score: number;
  total: number;
  correct: number;
  incorrect: number;
  percentage: number;
  timeTakenSeconds: number;
  timedOut: boolean;
  performanceMessage: string;
  submittedAt: string;
  questions: ReviewedQuestion[];
};

export type StoredAttempt = {
  id: string;
  quizId: string;
  startedAt: string;
  submittedAt?: string;
  result?: QuizResult;
};
