import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { verifyPassword, hashPassword, invalidateAllUserSessions, createSession, setSessionCookie } from "@/lib/auth";
import { validatePassword } from "@/lib/validations";

export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const { currentPassword, newPassword, newPasswordConfirm } = await req.json();

    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      return errorResponse("Current password, new password, and confirmation are required.");
    }

    if (newPassword !== newPasswordConfirm) {
      return errorResponse("New passwords do not match.");
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      return errorResponse(validation.errors[0], 400, validation.errors);
    }

    // Verify current password
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!userRecord) {
      return errorResponse("User not found.", 404);
    }

    const isMatch = await verifyPassword(currentPassword, userRecord.passwordHash);
    if (!isMatch) {
      return errorResponse("Incorrect current password.", 400);
    }

    const newHash = await hashPassword(newPassword);

    // Update password, clear all sessions, create fresh session
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    await invalidateAllUserSessions(user.id);

    const userAgent = req.headers.get("user-agent") || undefined;
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const newSession = await createSession(user.id, userAgent, ipAddress);
    setSessionCookie(newSession.token, newSession.expiresAt);

    return jsonResponse({
      message: "Password changed successfully. All other active sessions have been signed out.",
    });
  } catch (error: any) {
    console.error("Password change error:", error);
    return errorResponse("Failed to update password.", 500);
  }
}

