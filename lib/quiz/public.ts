import type { PublicQuiz, StoredQuiz } from "@/lib/quiz/types";

export function toPublicQuiz(quiz: StoredQuiz): PublicQuiz {
  return {
    id: quiz.id,
    title: quiz.title,
    topic: quiz.topic,
    difficulty: quiz.difficulty,
    questionType: quiz.questionType,
    timerSeconds: quiz.timerSeconds,
    createdAt: quiz.createdAt,
    fallback: quiz.fallback === true,
    questions: quiz.questions.map((question) => ({
      questionId: question.questionId,
      questionText: question.questionText,
      questionType: question.questionType,
      options: question.options,
    })),
  };
}
