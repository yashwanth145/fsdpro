import type { QuizResult } from "@/lib/quiz/types";

const HISTORY_KEY = "lumina.quizHistory.v1";

function isQuizResult(value: unknown): value is QuizResult {
  if (!value || typeof value !== "object") return false;
  const result = value as QuizResult;
  return typeof result.attemptId === "string"
    && typeof result.quizId === "string"
    && typeof result.percentage === "number"
    && typeof result.submittedAt === "string"
    && Array.isArray(result.questions);
}

export function readLocalHistory(): QuizResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isQuizResult);
  } catch {
    return [];
  }
}

export function saveLocalHistory(result: QuizResult): void {
  if (typeof window === "undefined") return;
  const next = [
    result,
    ...readLocalHistory().filter((item) => item.attemptId !== result.attemptId),
  ].slice(0, 50);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function mergeHistory(remote: QuizResult[], local: QuizResult[]): QuizResult[] {
  const byId = new Map<string, QuizResult>();
  for (const item of local) {
    if (isQuizResult(item)) byId.set(item.attemptId, item);
  }
  for (const item of remote) {
    if (isQuizResult(item)) byId.set(item.attemptId, item);
  }
  return [...byId.values()].sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
}
