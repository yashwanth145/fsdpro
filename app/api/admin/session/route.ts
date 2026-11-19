import { NextResponse } from "next/server";
import { adminCookieMaxAge, adminCookieName, adminToken, hasAdminSession, sealAdminSession, tokensMatch } from "@/lib/admin";
import { jsonError } from "@/lib/http";

export async function GET() {
  return Response.json({
    configured: Boolean(adminToken()),
    authenticated: await hasAdminSession(),
  });
}

export async function POST(request: Request) {
  if (!adminToken()) {
    return jsonError(
      "Set ADMIN_TOKEN in .env.local to the same value stored by supabase/admin-questions.sql.",
      503,
      "ADMIN_NOT_CONFIGURED",
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Send the admin token as JSON.", 400, "INVALID_JSON");
  }
  const token = typeof body === "object" && body && "token" in body ? String((body as { token: unknown }).token) : "";
  if (!tokensMatch(token)) {
    return jsonError("That admin token is wrong.", 401, "UNAUTHORIZED");
  }
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(adminCookieName, sealAdminSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: adminCookieMaxAge,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(adminCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
