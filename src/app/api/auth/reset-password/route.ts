import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, invalidateAllUserSessions } from "@/lib/auth";
import { validatePassword } from "@/lib/validations";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const { token, password, passwordConfirm } = await req.json();

    if (!token || typeof token !== "string") {
      return errorResponse("Reset token is required.");
    }

    if (!password || !passwordConfirm) {
      return errorResponse("New password and confirmation are required.");
    }

    if (password !== passwordConfirm) {
      return errorResponse("Passwords do not match.");
    }

    const validation = validatePassword(password);
    if (!validation.isValid) {
      return errorResponse(validation.errors[0], 400, validation.errors);
    }

    const user = await prisma.user.findFirst({
      where: { resetPasswordToken: token },
    });

    if (!user) {
      return errorResponse("Invalid or already used password reset token.", 400);
    }

    if (user.resetPasswordExpiresAt && user.resetPasswordExpiresAt < new Date()) {
      return errorResponse("Password reset token has expired. Please request a new one.", 400);
    }

    const passwordHash = await hashPassword(password);

    // Update password and clear token in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetPasswordToken: null,
          resetPasswordExpiresAt: null,
        },
      }),
      prisma.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    return jsonResponse({
      message: "Your password has been reset successfully. Please sign in with your new password.",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return errorResponse("An error occurred while resetting your password.", 500);
  }
}

