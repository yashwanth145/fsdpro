import "server-only";

import type { QuizResult, StoredQuiz } from "@/lib/quiz/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function displayName(user: { email?: string; user_metadata?: Record<string, unknown> }): string {
  const fromMeta = user.user_metadata?.display_name;
  if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim();
  return user.email?.split("@")[0] || "Learner";
}

export async function persistAttempt(
  quiz: StoredQuiz,
  result: QuizResult,
): Promise<{ saved: boolean }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { saved: false };

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { saved: false };
  const user = data.user;

  const profile = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: displayName(user),
  });
  if (profile.error && profile.error.code !== "42P01") {
    console.error("Profile save failed", profile.error.code);
  }

  const quizInsert = await supabase.from("quizzes").upsert({
    id: quiz.id,
    user_id: user.id,
    title: quiz.title,
    topic: quiz.topic,
    difficulty: quiz.difficulty,
    question_type: quiz.questionType,
    timer_seconds: quiz.timerSeconds,
    created_at: quiz.createdAt,
  });
  if (quizInsert.error) {
    console.error("Quiz save failed", quizInsert.error.code);
    return { saved: false };
  }

  const questionInsert = await supabase.from("questions").upsert(
    quiz.questions.map((question, index) => ({
      quiz_id: quiz.id,
      id: question.questionId,
      position: index + 1,
      question_text: question.questionText,
      question_type: question.questionType,
      options: question.options,
      correct_answer: question.correctAnswer,
      explanation: question.explanation,
    })),
  );
  if (questionInsert.error) {
    console.error("Question save failed", questionInsert.error.code);
    return { saved: false };
  }

  const attemptInsert = await supabase.from("quiz_attempts").upsert({
    id: result.attemptId,
    user_id: user.id,
    quiz_id: quiz.id,
    score: result.score,
    total: result.total,
    percentage: result.percentage,
    time_taken_seconds: result.timeTakenSeconds,
    submitted_at: result.submittedAt,
    subject: result.topic,
    difficulty: result.difficulty,
    title: result.title,
    review: result,
  });
  if (attemptInsert.error) {
    console.error("Attempt save failed", attemptInsert.error.code);
    return { saved: false };
  }

  const answerInsert = await supabase.from("quiz_answers").upsert(
    result.questions.map((question) => ({
      attempt_id: result.attemptId,
      question_id: question.questionId,
      selected_answer: question.selectedAnswer,
      correct_answer: question.correctAnswer,
      is_correct: question.isCorrect,
    })),
  );
  if (answerInsert.error) {
    console.error("Answer save failed", answerInsert.error.code);
    return { saved: false };
  }

  return { saved: true };
}

function isQuizResult(value: unknown): value is QuizResult {
  if (!value || typeof value !== "object") return false;
  const result = value as QuizResult;
  return typeof result.attemptId === "string"
    && typeof result.quizId === "string"
    && typeof result.percentage === "number"
    && Array.isArray(result.questions);
}

export async function listAccountHistory(): Promise<{
  authenticated: boolean;
  attempts: QuizResult[];
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { authenticated: false, attempts: [] };

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { authenticated: false, attempts: [] };

  const history = await supabase
    .from("quiz_attempts")
    .select("review")
    .eq("user_id", data.user.id)
    .order("submitted_at", { ascending: false })
    .limit(50);

  if (history.error) {
    console.error("History read failed", history.error.code);
    return { authenticated: true, attempts: [] };
  }

  const attempts = (history.data ?? [])
    .map((row) => row.review)
    .filter(isQuizResult);
  return { authenticated: true, attempts };
}

export async function getAccountResult(attemptId: string): Promise<QuizResult | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const row = await supabase
    .from("quiz_attempts")
    .select("review")
    .eq("id", attemptId)
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (row.error || !row.data) return null;
  return isQuizResult(row.data.review) ? row.data.review : null;
}
