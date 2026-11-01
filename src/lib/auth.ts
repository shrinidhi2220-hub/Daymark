import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { Prisma } from "@prisma/client";

const SESSION_COOKIE_NAME = "daymark_session";
const SESSION_MAX_AGE_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export async function createSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string
) {
  const token = generateSecureToken(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_MAX_AGE_DAYS);

  const session = await prisma.session.create({
    data: {
      token,
      userId,
      userAgent: userAgent ? userAgent.substring(0, 255) : null,
      ipAddress: ipAddress ? ipAddress.substring(0, 45) : null,
      expiresAt,
    },
  });

  return session;
}

export async function invalidateSession(token: string) {
  try {
    await prisma.session.delete({
      where: { token },
    });
  } catch {
    // Session might already be gone
  }
}

export async function invalidateAllUserSessions(userId: string) {
  await prisma.session.deleteMany({
    where: { userId },
  });
}

export type AuthUser = Prisma.UserGetPayload<{
  include: {
    workspaceMemberships: {
      include: {
        workspace: true;
      };
    };
  };
}>;

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: {
      user: {
        include: {
          workspaceMemberships: {
            include: {
              workspace: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  // Check if expired
  if (session.expiresAt < new Date()) {
    await invalidateSession(sessionToken);
    return null;
  }

  // Slide expiration if it has been more than 1 day since last update
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (session.updatedAt < oneDayAgo) {
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + SESSION_MAX_AGE_DAYS);
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiresAt },
    });
  }

  return session.user;
}

export function setSessionCookie(token: string, expiresAt: Date) {
  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie() {
  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export const ROLE_HIERARCHY: Record<string, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
};

export async function getWorkspaceMembership(
  userId: string,
  workspaceId: string
) {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    include: {
      workspace: true,
    },
  });

  return member;
}

export function hasPermission(
  userRole: string,
  requiredRole: "VIEWER" | "MEMBER" | "ADMIN" | "OWNER"
): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 99);
}

