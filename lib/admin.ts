import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/supabase/env";

const COOKIE = "lumina_admin";
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export class AdminError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "AdminError";
    this.code = code;
    this.status = status;
  }
}

export function adminToken(): string {
  return process.env.ADMIN_TOKEN?.trim() ?? "";
}

export function tokensMatch(input: string): boolean {
  const expected = adminToken();
  const given = input.trim();
  if (!expected || expected.length !== given.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

export function sealAdminSession(): string {
  const expires = String(Date.now() + MAX_AGE_MS);
  const signature = createHmac("sha256", adminToken()).update(expires).digest("base64url");
  return `${expires}.${signature}`;
}

export async function hasAdminSession(): Promise<boolean> {
  const token = adminToken();
  if (!token) return false;
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE)?.value ?? "";
  const [expires, signature] = value.split(".");
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  const expected = createHmac("sha256", token).update(expires).digest("base64url");
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function requireAdmin(): Promise<void> {
  if (!adminToken()) {
    throw new AdminError(
      "Set ADMIN_TOKEN in .env.local to the same value stored by supabase/admin-questions.sql.",
      "ADMIN_NOT_CONFIGURED",
      503,
    );
  }
  if (!(await hasAdminSession())) {
    throw new AdminError("Sign in with the admin token first.", "UNAUTHORIZED", 401);
  }
}

function supabase() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new AdminError(
      "Add the Supabase URL and anon key, then run supabase/admin-questions.sql.",
      "BANK_NOT_CONFIGURED",
      503,
    );
  }
  return createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function raiseRpc(error: { message?: string; code?: string }): never {
  const message = error.message ?? "";
  if (/duplicate question/i.test(message)) {
    throw new AdminError("That question is already in this category and difficulty.", "DUPLICATE", 409);
  }
  if (/forbidden/i.test(message)) {
    throw new AdminError(
      "The admin token does not match the database. Use the same value in ADMIN_TOKEN and supabase/admin-questions.sql.",
      "FORBIDDEN",
      403,
    );
  }
  console.error("Admin question bank failed", error.code ?? "unknown");
  throw new AdminError(
    "The question admin tools are not ready. Run supabase/admin-questions.sql in the Supabase SQL editor.",
    "ADMIN_UNAVAILABLE",
    503,
  );
}

export type BankQuestion = {
  id: number;
  category: string;
  difficulty: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

export async function listBankQuestions(category: string, difficulty: string): Promise<BankQuestion[]> {
  await requireAdmin();
  const { data, error } = await supabase().rpc("admin_list_questions", {
    p_token: adminToken(),
    p_category: category,
    p_difficulty: difficulty,
  });
  if (error) raiseRpc(error);
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: Number(row.id),
    category: String(row.category),
    difficulty: String(row.difficulty),
    questionText: String(row.question_text),
    options: Array.isArray(row.options) ? row.options.map(String) : [],
    correctAnswer: String(row.correct_answer),
    explanation: String(row.explanation),
  }));
}

export async function addBankQuestion(input: {
  category: string;
  difficulty: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}): Promise<number> {
  await requireAdmin();
  const { data, error } = await supabase().rpc("admin_add_question", {
    p_token: adminToken(),
    p_category: input.category,
    p_difficulty: input.difficulty,
    p_question: input.questionText,
    p_options: input.options,
    p_correct: input.correctAnswer,
    p_explanation: input.explanation,
  });
  if (error) raiseRpc(error);
  const id = Number((data as { id?: number } | null)?.id);
  if (!Number.isFinite(id)) {
    throw new AdminError("The question was not saved.", "ADMIN_UNAVAILABLE", 503);
  }
  return id;
}

export async function deleteBankQuestions(ids: number[]): Promise<number> {
  await requireAdmin();
  const { data, error } = await supabase().rpc("admin_delete_questions", {
    p_token: adminToken(),
    p_ids: ids,
  });
  if (error) raiseRpc(error);
  return Number(data ?? 0);
}

export const adminCookieName = COOKIE;
export const adminCookieMaxAge = MAX_AGE_MS / 1000;
