import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return errorResponse("Verification token is required.");
    }

    const user = await prisma.user.findFirst({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      return errorResponse("Invalid or already used verification token.", 400);
    }

    if (user.isEmailVerified) {
      return jsonResponse({ message: "Email is already verified." });
    }

    if (user.emailVerifyExpiresAt && user.emailVerifyExpiresAt < new Date()) {
      return errorResponse("Verification token has expired. Please request a new one from Settings.", 400);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiresAt: null,
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Email verified",
        message: "Your email address has been successfully verified.",
        type: "SUCCESS",
      },
    });

    return jsonResponse({ message: "Email verified successfully." });
  } catch (error: any) {
    console.error("Email verification error:", error);
    return errorResponse("An error occurred during email verification.", 500);
  }
}

