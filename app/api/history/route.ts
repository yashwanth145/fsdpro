import { listAccountHistory } from "@/lib/supabase/persist";

export async function GET() {
  const history = await listAccountHistory();
  return Response.json(history);
}
