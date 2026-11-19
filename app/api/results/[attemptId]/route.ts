import { jsonError } from "@/lib/http";
import { responseForStoreError } from "@/lib/quiz/remote-store";
import { getAttempt } from "@/lib/quiz/store";
import { getAccountResult } from "@/lib/supabase/persist";

export async function GET(
  _request: Request,
  context: { params: Promise<{ attemptId: string }> },
) {
  try {
    const { attemptId } = await context.params;
    const attempt = await getAttempt(attemptId);
    if (attempt?.result) {
      return Response.json({ result: attempt.result });
    }

    const remote = await getAccountResult(attemptId);
    if (remote) return Response.json({ result: remote });

    return jsonError("That result could not be found on this device or account.", 404, "NOT_FOUND");
  } catch (error) {
    return responseForStoreError(error) ?? jsonError("That result could not be loaded.", 500, "INTERNAL");
  }
}
