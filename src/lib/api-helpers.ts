import { NextResponse } from "next/server";
import { getCurrentUser, AuthUser } from "./auth";

export function jsonResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400, details?: any) {
  return NextResponse.json(
    {
      error: message,
      details,
    },
    { status }
  );
}

export async function requireAuth(): Promise<
  { user: AuthUser; error?: null } | { user?: null; error: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      ),
    };
  }
  return { user };
}

