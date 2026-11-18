import type { QuizResult, StoredQuiz } from "@/lib/quiz/types";

export function performanceMessage(percentage: number): string {
  if (percentage >= 90) {
    return "Excellent work. You have a strong grasp of this topic.";
  }
  if (percentage >= 75) {
    return "Great score. A short review of the missed questions will lock this in.";
  }
  if (percentage >= 60) {
    return "Solid effort. Read the explanations, then try the quiz again.";
  }
  if (percentage >= 40) {
    return "You are building a foundation. Review the questions you missed.";
  }
  return "Keep going. Work through each explanation, then retry the quiz.";
}

export function remainingSeconds(
  startedAt: string,
  timerSeconds: number | null,
  now = Date.now(),
): number | null {
  if (timerSeconds == null) return null;
  const started = Date.parse(startedAt);
  if (Number.isNaN(started)) return timerSeconds;
  const elapsed = Math.floor((now - started) / 1000);
  return Math.max(0, timerSeconds - elapsed);
}

export function scoreAttempt(
  quiz: StoredQuiz,
  attemptId: string,
  answers: Record<string, unknown>,
  startedAt: string,
  submittedAt: string,
): QuizResult {
  const started = Date.parse(startedAt);
  const submitted = Date.parse(submittedAt);
  const elapsed = Number.isNaN(started) || Number.isNaN(submitted)
    ? 0
    : Math.max(0, Math.round((submitted - started) / 1000));
  const timedOut = quiz.timerSeconds != null && elapsed >= quiz.timerSeconds;
  const timeTakenSeconds = quiz.timerSeconds != null
    ? Math.min(elapsed, quiz.timerSeconds)
    : elapsed;

  const questions = quiz.questions.map((question) => {
    const raw = answers[question.questionId];
    const selected = typeof raw === "string" && question.options.includes(raw) ? raw : null;
    return {
      questionId: question.questionId,
      questionText: question.questionText,
      questionType: question.questionType,
      options: question.options,
      correctAnswer: question.correctAnswer,
      selectedAnswer: selected,
      isCorrect: selected === question.correctAnswer,
      explanation: question.explanation,
    };
  });

  const correct = questions.filter((question) => question.isCorrect).length;
  const total = questions.length;
  const incorrect = total - correct;
  const percentage = total === 0 ? 0 : Math.round((correct / total) * 100);

  return {
    attemptId,
    quizId: quiz.id,
    title: quiz.title,
    topic: quiz.topic,
    difficulty: quiz.difficulty,
    questionType: quiz.questionType,
    score: correct,
    total,
    correct,
    incorrect,
    percentage,
    timeTakenSeconds,
    timedOut,
    performanceMessage: performanceMessage(percentage),
    submittedAt,
    questions,
  };
}
