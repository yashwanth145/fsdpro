import { randomUUID } from "node:crypto";
import { jsonError } from "@/lib/http";
import { BankError, drawQuizFromBank } from "@/lib/quiz/bank";
import { toPublicQuiz } from "@/lib/quiz/public";
import { parseGenerateRequest } from "@/lib/quiz/schema";
import { saveGeneratedQuiz } from "@/lib/quiz/store";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Send the quiz request as JSON.", 400, "INVALID_JSON");
  }

  const parsed = parseGenerateRequest(body);
  if (!parsed.ok) {
    return Response.json(
      { error: parsed.message, code: "INVALID_INPUT", fields: parsed.fields },
      { status: 400 },
    );
  }

  try {
    const content = await drawQuizFromBank(parsed.data);
    const quiz = await saveGeneratedQuiz(
      randomUUID(),
      content,
      parsed.data.timerMinutes == null ? null : parsed.data.timerMinutes * 60,
    );
    return Response.json({ quiz: toPublicQuiz(quiz) });
  } catch (error) {
    if (error instanceof BankError) {
      console.error("Quiz draw failed", error.code, error.status);
      return jsonError(error.message, error.status, error.code);
    }
    console.error("Quiz draw failed", error instanceof Error ? error.name : "unknown");
    return jsonError("Something went wrong while building the quiz.", 500, "INTERNAL");
  }
}
