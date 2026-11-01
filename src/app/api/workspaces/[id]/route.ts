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
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: params.id,
          userId: user.id,
        },
      },
      include: {
        workspace: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            projects: true,
            activities: {
              take: 20,
              orderBy: { createdAt: "desc" },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!member) {
      return errorResponse("Workspace not found or permission denied.", 403);
    }

    return jsonResponse({
      workspace: member.workspace,
      currentUserRole: member.role,
    });
  } catch (error: any) {
    console.error("Get workspace error:", error);
    return errorResponse("Failed to fetch workspace.", 500);
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
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: params.id,
          userId: user.id,
        },
      },
    });

    if (!member || !hasPermission(member.role, "ADMIN")) {
      return errorResponse("You must be an admin or owner to update workspace settings.", 403);
    }

    const { name, description, isArchived } = await req.json();
    const updateData: any = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return errorResponse("Workspace name cannot be empty.");
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description ? description.trim() : null;
    }

    if (isArchived !== undefined) {
      updateData.isArchived = Boolean(isArchived);
    }

    const updated = await prisma.workspace.update({
      where: { id: params.id },
      data: updateData,
    });

    await logWorkspaceActivity(
      params.id,
      user.id,
      "WORKSPACE_UPDATED",
      `Updated settings for "${updated.name}"`
    );

    return jsonResponse({
      message: "Workspace updated successfully.",
      workspace: updated,
    });
  } catch (error: any) {
    console.error("Update workspace error:", error);
    return errorResponse("Failed to update workspace.", 500);
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
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: params.id,
          userId: user.id,
        },
      },
    });

    if (!member || member.role !== "OWNER") {
      return errorResponse("Only the workspace owner can delete this workspace.", 403);
    }

    await prisma.workspace.delete({
      where: { id: params.id },
    });

    return jsonResponse({ message: "Workspace deleted successfully." });
  } catch (error: any) {
    console.error("Delete workspace error:", error);
    return errorResponse("Failed to delete workspace.", 500);
  }
}

