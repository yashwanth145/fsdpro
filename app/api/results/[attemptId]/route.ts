import { jsonError } from "@/lib/http";
import { getAttempt } from "@/lib/quiz/store";
import { getAccountResult } from "@/lib/supabase/persist";

export async function GET(
  _request: Request,
  context: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await context.params;
  const attempt = await getAttempt(attemptId);
  if (attempt?.result) {
    return Response.json({ result: attempt.result });
  }

  const remote = await getAccountResult(attemptId);
  if (remote) return Response.json({ result: remote });

  return jsonError("That result could not be found on this device or account.", 404, "NOT_FOUND");
}
