import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { logWorkspaceActivity } from "@/lib/activity";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { token: params.token },
      include: {
        workspace: {
          select: { id: true, name: true, description: true },
        },
        invitedBy: {
          select: { name: true, email: true },
        },
      },
    });

    if (!invitation) {
      return errorResponse("Invitation not found or invalid link.", 404);
    }

    const now = new Date();
    let state = invitation.status; // PENDING, ACCEPTED, REVOKED, DECLINED
    if (state === "PENDING" && invitation.expiresAt < now) {
      state = "EXPIRED";
    }

    const currentUser = await getCurrentUser();

    return jsonResponse({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        state,
        expiresAt: invitation.expiresAt,
        workspace: invitation.workspace,
        invitedBy: invitation.invitedBy,
      },
      currentUser: currentUser
        ? {
            id: currentUser.id,
            email: currentUser.email,
            name: currentUser.name,
            matchesEmail: currentUser.email.toLowerCase() === invitation.email.toLowerCase(),
          }
        : null,
    });
  } catch (error: any) {
    console.error("Get invitation error:", error);
    return errorResponse("Failed to fetch invitation details.", 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return errorResponse("Please sign in or sign up to accept this invitation.", 401);
  }

  try {
    const { action } = await req.json(); // "ACCEPT" | "DECLINE"

    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { token: params.token },
      include: { workspace: true },
    });

    if (!invitation) {
      return errorResponse("Invitation not found.", 404);
    }

    if (invitation.status === "REVOKED") {
      return errorResponse("This invitation has been revoked by the workspace administrator.", 400);
    }

    if (invitation.status === "ACCEPTED") {
      return errorResponse("This invitation has already been accepted.", 400);
    }

    if (invitation.status === "DECLINED") {
      return errorResponse("This invitation was declined.", 400);
    }

    if (invitation.expiresAt < new Date()) {
      return errorResponse("This invitation has expired.", 400);
    }

    // Email match verification
    if (currentUser.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return errorResponse(
        `This invitation was sent to ${invitation.email}. You are currently signed in as ${currentUser.email}. Please sign in with the invited email address to accept.`,
        403
      );
    }

    if (action === "DECLINE") {
      await prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: "DECLINED" },
      });
      return jsonResponse({ message: "Invitation declined." });
    }

    // ACCEPT: Create membership and update invitation in a transaction
    await prisma.$transaction([
      prisma.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: invitation.workspaceId,
            userId: currentUser.id,
          },
        },
        update: {
          role: invitation.role,
        },
        create: {
          workspaceId: invitation.workspaceId,
          userId: currentUser.id,
          role: invitation.role,
        },
      }),
      prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      }),
    ]);

    await logWorkspaceActivity(
      invitation.workspaceId,
      currentUser.id,
      "MEMBER_JOINED",
      `${currentUser.name} accepted invitation and joined as ${invitation.role}`
    );

    return jsonResponse({
      message: `You have successfully joined ${invitation.workspace.name}!`,
      workspaceId: invitation.workspaceId,
    });
  } catch (error: any) {
    console.error("Accept invitation error:", error);
    return errorResponse("Failed to process invitation response.", 500);
  }
}

