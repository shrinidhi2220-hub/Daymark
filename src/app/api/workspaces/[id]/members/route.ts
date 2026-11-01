import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { hasPermission } from "@/lib/auth";
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

    if (!callerMember) {
      return errorResponse("Workspace access denied.", 403);
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return jsonResponse({ members });
  } catch (error: any) {
    console.error("List members error:", error);
    return errorResponse("Failed to fetch members.", 500);
  }
}

export async function PUT(
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
      return errorResponse("Admin or Owner role required to manage member roles.", 403);
    }

    const { targetUserId, newRole } = await req.json();

    const allowedRoles = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];
    if (!allowedRoles.includes(newRole)) {
      return errorResponse("Invalid role.");
    }

    const targetMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: params.id,
          userId: targetUserId,
        },
      },
    });

    if (!targetMember) {
      return errorResponse("Member not found in this workspace.", 404);
    }

    // Only OWNER can transfer or create other owners or modify owners
    if (newRole === "OWNER" && callerMember.role !== "OWNER") {
      return errorResponse("Only the workspace owner can assign or transfer the Owner role.", 403);
    }

    if (targetMember.role === "OWNER" && callerMember.role !== "OWNER") {
      return errorResponse("Admins cannot modify the workspace owner's role.", 403);
    }

    // Check last owner protection: if demoting target who is OWNER
    if (targetMember.role === "OWNER" && newRole !== "OWNER") {
      const ownerCount = await prisma.workspaceMember.count({
        where: { workspaceId: params.id, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        return errorResponse("Cannot demote the last remaining owner of the workspace.", 400);
      }
    }

    const updated = await prisma.workspaceMember.update({
      where: { id: targetMember.id },
      data: { role: newRole },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    await logWorkspaceActivity(
      params.id,
      user.id,
      "ROLE_CHANGED",
      `Changed role of ${updated.user.name} to ${newRole}`
    );

    return jsonResponse({
      message: `Role updated to ${newRole}.`,
      member: updated,
    });
  } catch (error: any) {
    console.error("Update member role error:", error);
    return errorResponse("Failed to update member role.", 500);
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

    if (!callerMember) {
      return errorResponse("Workspace access denied.", 403);
    }

    const { targetUserId } = await req.json();

    // Self-leave is allowed for non-owners, or if caller is ADMIN/OWNER
    const isSelf = targetUserId === user.id;

    if (!isSelf && !hasPermission(callerMember.role, "ADMIN")) {
      return errorResponse("Admin or Owner role required to remove members.", 403);
    }

    const targetMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: params.id,
          userId: targetUserId,
        },
      },
      include: {
        user: { select: { name: true } },
      },
    });

    if (!targetMember) {
      return errorResponse("Member not found.", 404);
    }

    // Cannot remove owner unless caller is owner, and cannot remove LAST owner
    if (targetMember.role === "OWNER") {
      const ownerCount = await prisma.workspaceMember.count({
        where: { workspaceId: params.id, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        return errorResponse("Cannot remove the last remaining owner of the workspace.", 400);
      }
      if (!isSelf && callerMember.role !== "OWNER") {
        return errorResponse("Only the workspace owner can remove another owner.", 403);
      }
    }

    await prisma.workspaceMember.delete({
      where: { id: targetMember.id },
    });

    await logWorkspaceActivity(
      params.id,
      user.id,
      "MEMBER_REMOVED",
      `${targetMember.user.name} was removed from the workspace`
    );

    return jsonResponse({ message: "Member removed from workspace." });
  } catch (error: any) {
    console.error("Remove member error:", error);
    return errorResponse("Failed to remove member.", 500);
  }
}

