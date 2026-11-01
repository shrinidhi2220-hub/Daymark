export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { logWorkspaceActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                members: true,
                projects: true,
                tasks: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    const workspaces = memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      description: m.workspace.description,
      isArchived: m.workspace.isArchived,
      role: m.role,
      counts: m.workspace._count,
      createdAt: m.workspace.createdAt,
    }));

    return jsonResponse({ workspaces });
  } catch (error: any) {
    console.error("List workspaces error:", error);
    return errorResponse("Failed to load workspaces.", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const { name, description } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return errorResponse("Workspace name is required.");
    }

    const trimmedName = name.trim();
    const baseSlug = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    let slug = baseSlug || "workspace";
    let counter = 1;
    while (await prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: trimmedName,
        slug,
        description: description ? description.trim() : null,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
      include: {
        members: true,
      },
    });

    await logWorkspaceActivity(
      workspace.id,
      user.id,
      "WORKSPACE_CREATED",
      `Created workspace "${workspace.name}"`
    );

    return jsonResponse(
      {
        message: "Workspace created successfully.",
        workspace,
      },
      201
    );
  } catch (error: any) {
    console.error("Create workspace error:", error);
    return errorResponse("Failed to create workspace.", 500);
  }
}

