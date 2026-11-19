import { randomUUID } from "node:crypto";
import { jsonError } from "@/lib/http";
import { responseForStoreError } from "@/lib/quiz/remote-store";
import { toPublicQuiz } from "@/lib/quiz/public";
import { getQuiz, startAttempt } from "@/lib/quiz/store";

export async function POST(request: Request) {
  try {
    return await startQuiz(request);
  } catch (error) {
    return responseForStoreError(error) ?? jsonError("The quiz could not be started.", 500, "INTERNAL");
  }
}

async function startQuiz(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Send the quiz id as JSON.", 400, "INVALID_JSON");
  }

  const quizId = typeof body === "object" && body && "quizId" in body
    ? (body as { quizId: unknown }).quizId
    : null;
  if (typeof quizId !== "string" || quizId.length < 8) {
    return jsonError("A valid quiz id is required.", 400, "INVALID_INPUT");
  }

  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return jsonError("This quiz is no longer available. Generate a new one.", 404, "NOT_FOUND");
  }

  const attempt = await startAttempt(quizId, randomUUID());
  if (!attempt) {
    return jsonError("This quiz is no longer available. Generate a new one.", 404, "NOT_FOUND");
  }

  return Response.json({
    attemptId: attempt.id,
    startedAt: attempt.startedAt,
    quiz: toPublicQuiz(quiz),
  });
}
