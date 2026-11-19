import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { jsonError } from "@/lib/http";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { StoredAttempt, StoredQuiz } from "@/lib/quiz/types";

export class StoreError extends Error {
  readonly code = "STORE_UNAVAILABLE";
  readonly status = 503;

  constructor(message: string) {
    super(message);
    this.name = "StoreError";
  }
}

export function usesRemoteQuizStore(): boolean {
  return process.env.VERCEL === "1" && getSupabaseEnv() !== null;
}

function client(): SupabaseClient {
  const env = getSupabaseEnv();
  if (!env) {
    throw new StoreError("Add the Supabase URL and anon key on Vercel, then redeploy.");
  }
  return createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function call(name: string, args: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await client().rpc(name, args);
  if (error) {
    console.error("Live quiz store failed", name, error.code);
    throw new StoreError(
      "The live quiz store is missing. Run supabase/live-quizzes.sql in the Supabase SQL editor, then try again.",
    );
  }
  return data;
}

export async function saveRemoteQuiz(quiz: StoredQuiz): Promise<void> {
  await call("save_live_quiz", { p_id: quiz.id, p_payload: quiz });
}

export async function getRemoteQuiz(id: string): Promise<StoredQuiz | null> {
  const data = await call("get_live_quiz", { p_id: id });
  if (!data || typeof data !== "object") return null;
  return data as StoredQuiz;
}

export async function saveRemoteAttempt(attempt: StoredAttempt): Promise<void> {
  await call("save_live_attempt", {
    p_id: attempt.id,
    p_quiz_id: attempt.quizId,
    p_payload: attempt,
  });
}

export async function getRemoteAttempt(id: string): Promise<StoredAttempt | null> {
  const data = await call("get_live_attempt", { p_id: id });
  if (!data || typeof data !== "object") return null;
  return data as StoredAttempt;
}

export function responseForStoreError(error: unknown): Response | null {
  if (error instanceof StoreError) return jsonError(error.message, error.status, error.code);
  return null;
}
