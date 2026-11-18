import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET() {
  return Response.json({
    supabaseConfigured: isSupabaseConfigured(),
  });
}
