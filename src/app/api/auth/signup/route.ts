import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createSession, setSessionCookie, generateSecureToken } from "@/lib/auth";
import { isValidEmail, validatePassword } from "@/lib/validations";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, passwordConfirm, timezone } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return errorResponse("Full name is required.");
    }

    if (!email || !isValidEmail(email)) {
      return errorResponse("A valid email address is required.");
    }

    if (!password || !passwordConfirm) {
      return errorResponse("Password and password confirmation are required.");
    }

    if (password !== passwordConfirm) {
      return errorResponse("Passwords do not match.");
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return errorResponse(
        passwordValidation.errors[0] || "Password does not meet security requirements.",
        400,
        passwordValidation.errors
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check for existing user
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return errorResponse("An account with this email address already exists.");
    }

    const passwordHash = await hashPassword(password);
    const emailVerifyToken = generateSecureToken(32);
    const emailVerifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        timezone: timezone || "UTC",
        isEmailVerified: false,
        emailVerifyToken,
        emailVerifyExpiresAt,
      },
    });

    // Create session
    const userAgent = req.headers.get("user-agent") || undefined;
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const session = await createSession(user.id, userAgent, ipAddress);
    setSessionCookie(session.token, session.expiresAt);

    // Create welcome notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Welcome to Daymark!",
        message: "Your workspace is ready. Check your settings and explore your daily dashboard.",
        type: "INFO",
        linkUrl: "/dashboard",
      },
    });

    return jsonResponse(
      {
        message: "Account created successfully.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          timezone: user.timezone,
          isEmailVerified: user.isEmailVerified,
        },
        // We also return the verification link for local dev convenience
        verificationToken: emailVerifyToken,
      },
      201
    );
  } catch (error: any) {
    console.error("Sign up error:", error);
    return errorResponse("An unexpected error occurred while creating your account. Please try again.", 500);
  }
}

