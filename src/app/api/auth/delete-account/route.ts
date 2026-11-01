import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { verifyPassword, clearSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const { password, confirmationText } = await req.json();

    if (confirmationText !== "DELETE") {
      return errorResponse("Please type 'DELETE' to confirm account deletion.");
    }

    if (!password) {
      return errorResponse("Your password is required to verify account deletion.");
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        ownedWorkspaces: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!userRecord) {
      return errorResponse("User not found.", 404);
    }

    const isMatch = await verifyPassword(password, userRecord.passwordHash);
    if (!isMatch) {
      return errorResponse("Incorrect password.", 400);
    }

    // Check if user is the sole owner of any multi-member workspace
    const soleOwnerWorkspaces = userRecord.ownedWorkspaces.filter(
      (ws) => ws.members.length > 1
    );

    if (soleOwnerWorkspaces.length > 0) {
      return errorResponse(
        `Cannot delete account: You are the owner of shared workspace(s) "${soleOwnerWorkspaces
          .map((w) => w.name)
          .join(", ")}". Please transfer ownership to another admin or delete the workspace first.`,
        400
      );
    }

    // Delete workspaces where user is the only member
    for (const ws of userRecord.ownedWorkspaces) {
      if (ws.members.length <= 1) {
        await prisma.workspace.delete({
          where: { id: ws.id },
        });
      }
    }

    // Delete user (Prisma cascade deletes personal applications, courses, saved links, sessions, reminders)
    await prisma.user.delete({
      where: { id: user.id },
    });

    clearSessionCookie();

    return jsonResponse({
      message: "Account and associated personal data deleted successfully.",
    });
  } catch (error: any) {
    console.error("Account deletion error:", error);
    return errorResponse("An error occurred while deleting your account.", 500);
  }
}

