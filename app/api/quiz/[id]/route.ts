import { jsonError } from "@/lib/http";
import { responseForStoreError } from "@/lib/quiz/remote-store";
import { toPublicQuiz } from "@/lib/quiz/public";
import { getQuiz } from "@/lib/quiz/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const quiz = await getQuiz(id);
    if (!quiz) {
      return jsonError("This quiz is no longer available. Generate a new one.", 404, "NOT_FOUND");
    }
    return Response.json({ quiz: toPublicQuiz(quiz) });
  } catch (error) {
    return responseForStoreError(error) ?? jsonError("The quiz could not be loaded.", 500, "INTERNAL");
  }
}
