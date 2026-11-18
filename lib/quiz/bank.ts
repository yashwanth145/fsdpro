import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { GenerateRequest, QuizContent, QuizQuestion } from "@/lib/quiz/types";

type BankRow = {
  id: number;
  category: string;
  difficulty: string;
  question_text: string;
  options: unknown;
  correct_answer: string;
  explanation: string;
};

export class BankError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "BankError";
    this.code = code;
    this.status = status;
  }
}

function asOptions(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length !== 4) return null;
  if (!value.every((option) => typeof option === "string" && option.trim())) return null;
  return value.map((option) => option.trim());
}

export async function drawQuizFromBank(request: GenerateRequest): Promise<QuizContent> {
  const env = getSupabaseEnv();
  if (!env) {
    throw new BankError(
      "Add the Supabase URL and anon key, then run supabase/question-bank.sql in the SQL editor.",
      "BANK_NOT_CONFIGURED",
      503,
    );
  }

  const supabase = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("draw_questions", {
    p_category: request.topic,
    p_difficulty: request.difficulty,
    p_limit: request.questionCount,
  });

  if (error) {
    throw new BankError(
      "The question bank is not ready. Run supabase/question-bank.sql in the Supabase SQL editor.",
      "BANK_UNAVAILABLE",
      503,
    );
  }

  const rows = (data ?? []) as BankRow[];
  if (rows.length < request.questionCount) {
    throw new BankError(
      `The bank has ${rows.length} ${request.difficulty} ${request.topic} questions. Choose fewer questions or another difficulty.`,
      "BANK_TOO_SMALL",
      409,
    );
  }

  const questions: QuizQuestion[] = rows.slice(0, request.questionCount).map((row, index) => {
    const options = asOptions(row.options);
    if (!options || !options.includes(row.correct_answer)) {
      throw new BankError("A bank question is missing four options.", "BANK_INVALID", 500);
    }
    return {
      questionId: `q${index + 1}`,
      questionText: row.question_text,
      questionType: "multiple_choice",
      options,
      correctAnswer: row.correct_answer,
      explanation: row.explanation,
    };
  });

  const focus = request.description.trim();
  return {
    title: focus ? `${request.topic}: ${focus.slice(0, 90)}` : `${request.topic} quiz`,
    topic: request.topic,
    difficulty: request.difficulty,
    questionType: "multiple_choice",
    questions,
  };
}
