import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { invalidateSession, clearSessionCookie } from "@/lib/auth";
import { jsonResponse } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const sessionToken = cookies().get("daymark_session")?.value;
  if (sessionToken) {
    await invalidateSession(sessionToken);
  }
  clearSessionCookie();
  return jsonResponse({ message: "Signed out successfully." });
}

