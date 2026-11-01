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
    });

    if (!member) {
      return errorResponse("Workspace access denied.", 403);
    }

    const projects = await prisma.project.findMany({
      where: { workspaceId: params.id },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return jsonResponse({ projects });
  } catch (error: any) {
    console.error("List projects error:", error);
    return errorResponse("Failed to fetch projects.", 500);
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
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: params.id,
          userId: user.id,
        },
      },
    });

    if (!member || !hasPermission(member.role, "MEMBER")) {
      return errorResponse("Member role or higher required to create projects.", 403);
    }

    const { name, description, color = "#0c87eb" } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return errorResponse("Project name is required.");
    }

    const project = await prisma.project.create({
      data: {
        workspaceId: params.id,
        name: name.trim(),
        description: description ? description.trim() : null,
        color,
      },
    });

    await logWorkspaceActivity(
      params.id,
      user.id,
      "PROJECT_CREATED",
      `Created project "${project.name}"`
    );

    return jsonResponse({ project }, 201);
  } catch (error: any) {
    console.error("Create project error:", error);
    return errorResponse("Failed to create project.", 500);
  }
}

