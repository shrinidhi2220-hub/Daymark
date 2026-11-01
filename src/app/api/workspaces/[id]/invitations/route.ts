import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { hasPermission, generateSecureToken } from "@/lib/auth";
import { isValidEmail } from "@/lib/validations";
import { logWorkspaceActivity } from "@/lib/activity";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const callerMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: params.id,
          userId: user.id,
        },
      },
    });

    if (!callerMember || !hasPermission(callerMember.role, "ADMIN")) {
      return errorResponse("Admin permission required to view invitations.", 403);
    }

    const invitations = await prisma.workspaceInvitation.findMany({
      where: { workspaceId: params.id },
      include: {
        invitedBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse({ invitations });
  } catch (error: any) {
    console.error("List invitations error:", error);
    return errorResponse("Failed to fetch invitations.", 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const callerMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: params.id,
          userId: user.id,
        },
      },
    });

    if (!callerMember || !hasPermission(callerMember.role, "ADMIN")) {
      return errorResponse("Admin or Owner role required to invite members.", 403);
    }

    const { email, role = "MEMBER" } = await req.json();

    if (!email || !isValidEmail(email)) {
      return errorResponse("A valid recipient email address is required.");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const allowedRoles = ["ADMIN", "MEMBER", "VIEWER"];
    if (!allowedRoles.includes(role)) {
      return errorResponse("Invalid role. Must be ADMIN, MEMBER, or VIEWER.");
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: params.id,
            userId: existingUser.id,
          },
        },
      });

      if (existingMember) {
        return errorResponse("This user is already a member of the workspace.");
      }
    }

    // Check if there is already an active pending invitation
    const existingPending = await prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId: params.id,
        email: normalizedEmail,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });

    if (existingPending) {
      return errorResponse("An active invitation is already pending for this email address.");
    }

    const token = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.workspaceInvitation.create({
      data: {
        workspaceId: params.id,
        email: normalizedEmail,
        role,
        token,
        invitedById: user.id,
        status: "PENDING",
        expiresAt,
      },
    });

    await logWorkspaceActivity(
      params.id,
      user.id,
      "INVITATION_SENT",
      `Sent invitation to ${normalizedEmail} with ${role} role`
    );

    return jsonResponse(
      {
        message: `Invitation created for ${normalizedEmail}.`,
        invitation,
        inviteUrl: `/invite/${token}`,
      },
      201
    );
  } catch (error: any) {
    console.error("Create invitation error:", error);
    return errorResponse("Failed to create invitation.", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const callerMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: params.id,
          userId: user.id,
        },
      },
    });

    if (!callerMember || !hasPermission(callerMember.role, "ADMIN")) {
      return errorResponse("Admin or Owner role required to revoke invitations.", 403);
    }

    const { invitationId } = await req.json();

    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.workspaceId !== params.id) {
      return errorResponse("Invitation not found.", 404);
    }

    await prisma.workspaceInvitation.update({
      where: { id: invitationId },
      data: { status: "REVOKED" },
    });

    await logWorkspaceActivity(
      params.id,
      user.id,
      "INVITATION_REVOKED",
      `Revoked invitation for ${invitation.email}`
    );

    return jsonResponse({ message: "Invitation revoked successfully." });
  } catch (error: any) {
    console.error("Revoke invitation error:", error);
    return errorResponse("Failed to revoke invitation.", 500);
  }
}

