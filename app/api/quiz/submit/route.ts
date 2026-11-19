import { jsonError } from "@/lib/http";
import { responseForStoreError } from "@/lib/quiz/remote-store";
import { scoreAttempt } from "@/lib/quiz/score";
import { completeAttempt } from "@/lib/quiz/store";
import { persistAttempt } from "@/lib/supabase/persist";

export async function POST(request: Request) {
  try {
    return await submitQuiz(request);
  } catch (error) {
    return responseForStoreError(error) ?? jsonError("The quiz could not be submitted.", 500, "INTERNAL");
  }
}

async function submitQuiz(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Send your answers as JSON.", 400, "INVALID_JSON");
  }

  if (!body || typeof body !== "object") {
    return jsonError("Send your answers as JSON.", 400, "INVALID_INPUT");
  }

  const { attemptId, answers } = body as { attemptId?: unknown; answers?: unknown };
  if (typeof attemptId !== "string" || attemptId.length < 8) {
    return jsonError("A valid attempt id is required.", 400, "INVALID_INPUT");
  }
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return jsonError("Answers must be an object of question ids.", 400, "INVALID_INPUT");
  }

  const outcome = await completeAttempt(attemptId, (attempt, quiz) =>
    scoreAttempt(
      quiz,
      attempt.id,
      answers as Record<string, unknown>,
      attempt.startedAt,
      new Date().toISOString(),
    ),
  );

  if ("error" in outcome) {
    return jsonError("This quiz attempt was not found.", 404, "NOT_FOUND");
  }

  const saved = await persistAttempt(outcome.quiz, outcome.result);

  return Response.json({
    result: outcome.result,
    savedToAccount: saved.saved,
    alreadySubmitted: outcome.alreadySubmitted,
  });
}
