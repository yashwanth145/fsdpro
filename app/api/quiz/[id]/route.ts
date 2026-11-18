import { jsonError } from "@/lib/http";
import { toPublicQuiz } from "@/lib/quiz/public";
import { getQuiz } from "@/lib/quiz/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const quiz = await getQuiz(id);
  if (!quiz) {
    return jsonError("This quiz is no longer available. Generate a new one.", 404, "NOT_FOUND");
  }
  return Response.json({ quiz: toPublicQuiz(quiz) });
}
