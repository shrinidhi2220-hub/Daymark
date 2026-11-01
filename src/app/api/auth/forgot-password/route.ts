import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { generateSecureToken } from "@/lib/auth";
import { isValidEmail } from "@/lib/validations";
import { jsonResponse } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Standard response to avoid account enumeration
    const genericResponse = {
      message: "If an account exists with this email address, password reset instructions have been generated.",
    };

    if (!email || !isValidEmail(email)) {
      return jsonResponse(genericResponse);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      const resetPasswordToken = generateSecureToken(32);
      const resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken,
          resetPasswordExpiresAt,
        },
      });

      // In production or demo without configured SMTP, return reset token in response only for local testing
      // while preserving secure public message
      if (process.env.NODE_ENV !== "production") {
        return jsonResponse({
          ...genericResponse,
          developmentResetToken: resetPasswordToken,
        });
      }
    }

    return jsonResponse(genericResponse);
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return jsonResponse({
      message: "If an account exists with this email address, password reset instructions have been generated.",
    });
  }
}

