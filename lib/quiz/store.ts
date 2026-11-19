import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getRemoteAttempt,
  getRemoteQuiz,
  saveRemoteAttempt,
  saveRemoteQuiz,
  usesRemoteQuizStore,
} from "@/lib/quiz/remote-store";
import type { QuizContent, QuizResult, StoredAttempt, StoredQuiz } from "@/lib/quiz/types";

type Database = {
  quizzes: Record<string, StoredQuiz>;
  attempts: Record<string, StoredAttempt>;
};

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_QUIZZES = 200;

function emptyDb(): Database {
  return { quizzes: {}, attempts: {} };
}

function storeFile(): string {
  return process.env.QUIZ_STORE_PATH || path.join(process.cwd(), ".data", "quiz-store.json");
}

async function readDb(): Promise<Database> {
  try {
    const raw = await readFile(storeFile(), "utf8");
    const parsed = JSON.parse(raw) as Database;
    if (!parsed?.quizzes || !parsed?.attempts) return emptyDb();
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyDb();
    return emptyDb();
  }
}

async function writeDb(db: Database): Promise<void> {
  const file = storeFile();
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(db));
  await rename(temporary, file);
}

function prune(db: Database, now: number): void {
  for (const [id, quiz] of Object.entries(db.quizzes)) {
    if (now - Date.parse(quiz.createdAt) > MAX_AGE_MS) {
      delete db.quizzes[id];
    }
  }
  for (const [id, attempt] of Object.entries(db.attempts)) {
    const stamp = attempt.submittedAt ?? attempt.startedAt;
    if (!db.quizzes[attempt.quizId] || now - Date.parse(stamp) > MAX_AGE_MS) {
      delete db.attempts[id];
    }
  }

  const quizzes = Object.values(db.quizzes).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1
  );
  if (quizzes.length > MAX_QUIZZES) {
    for (const quiz of quizzes.slice(MAX_QUIZZES)) {
      delete db.quizzes[quiz.id];
    }
    for (const [id, attempt] of Object.entries(db.attempts)) {
      if (!db.quizzes[attempt.quizId]) delete db.attempts[id];
    }
  }
}

let queue: Promise<unknown> = Promise.resolve();

function update<T>(mutator: (db: Database) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await readDb();
    prune(db, Date.now());
    const result = await mutator(db);
    await writeDb(db);
    return result;
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function saveGeneratedQuiz(
  id: string,
  content: QuizContent,
  timerSeconds: number | null,
  fallback = false,
): Promise<StoredQuiz> {
  const quiz: StoredQuiz = {
    ...content,
    id,
    timerSeconds,
    createdAt: new Date().toISOString(),
    fallback,
  };
  if (usesRemoteQuizStore()) {
    await saveRemoteQuiz(quiz);
    return quiz;
  }
  await update((db) => {
    db.quizzes[quiz.id] = quiz;
  });
  return quiz;
}

export async function getQuiz(id: string): Promise<StoredQuiz | null> {
  if (usesRemoteQuizStore()) return getRemoteQuiz(id);
  const db = await readDb();
  return db.quizzes[id] ?? null;
}

export async function startAttempt(quizId: string, attemptId: string): Promise<StoredAttempt | null> {
  if (usesRemoteQuizStore()) {
    const quiz = await getRemoteQuiz(quizId);
    if (!quiz) return null;
    const attempt: StoredAttempt = {
      id: attemptId,
      quizId,
      startedAt: new Date().toISOString(),
    };
    await saveRemoteAttempt(attempt);
    return attempt;
  }
  return update((db) => {
    const quiz = db.quizzes[quizId];
    if (!quiz) return null;
    const attempt: StoredAttempt = {
      id: attemptId,
      quizId,
      startedAt: new Date().toISOString(),
    };
    db.attempts[attempt.id] = attempt;
    return attempt;
  });
}

export async function getAttempt(id: string): Promise<StoredAttempt | null> {
  if (usesRemoteQuizStore()) return getRemoteAttempt(id);
  const db = await readDb();
  return db.attempts[id] ?? null;
}

export async function completeAttempt(
  attemptId: string,
  buildResult: (attempt: StoredAttempt, quiz: StoredQuiz) => QuizResult,
): Promise<
  | { quiz: StoredQuiz; result: QuizResult; alreadySubmitted: boolean }
  | { error: "missing" }
> {
  if (usesRemoteQuizStore()) {
    const attempt = await getRemoteAttempt(attemptId);
    if (!attempt) return { error: "missing" as const };
    const quiz = await getRemoteQuiz(attempt.quizId);
    if (!quiz) return { error: "missing" as const };
    if (attempt.result) {
      return { quiz, result: attempt.result, alreadySubmitted: true };
    }
    const result = buildResult(attempt, quiz);
    await saveRemoteAttempt({
      ...attempt,
      submittedAt: result.submittedAt,
      result,
    });
    return { quiz, result, alreadySubmitted: false };
  }
  return update((db) => {
    const attempt = db.attempts[attemptId];
    if (!attempt) return { error: "missing" as const };
    const quiz = db.quizzes[attempt.quizId];
    if (!quiz) return { error: "missing" as const };
    if (attempt.result) {
      return { quiz, result: attempt.result, alreadySubmitted: true };
    }
    const result = buildResult(attempt, quiz);
    db.attempts[attemptId] = {
      ...attempt,
      submittedAt: result.submittedAt,
      result,
    };
    return { quiz, result, alreadySubmitted: false };
  });
}
