import { jsonError } from "@/lib/http";
import { toPublicQuiz } from "@/lib/quiz/public";
import { getAttempt, getQuiz } from "@/lib/quiz/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await context.params;
  const attempt = await getAttempt(attemptId);
  if (!attempt) {
    return jsonError("This quiz attempt was not found.", 404, "NOT_FOUND");
  }
  if (attempt.result) {
    return Response.json({ submitted: true, result: attempt.result });
  }

  const quiz = await getQuiz(attempt.quizId);
  if (!quiz) {
    return jsonError("This quiz is no longer available. Generate a new one.", 404, "NOT_FOUND");
  }

  return Response.json({
    submitted: false,
    attemptId: attempt.id,
    quizId: attempt.quizId,
    startedAt: attempt.startedAt,
    quiz: toPublicQuiz(quiz),
  });
}
