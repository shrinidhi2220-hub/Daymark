import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { logTaskActivity } from "@/lib/activity";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const parentTask = await prisma.task.findUnique({
      where: { id: params.id },
    });

    if (!parentTask) {
      return errorResponse("Parent task not found.", 404);
    }

    const { title } = await req.json();

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return errorResponse("Subtask title is required.");
    }

    const subtask = await prisma.task.create({
      data: {
        title: title.trim(),
        status: "TODO",
        priority: "NORMAL",
        creatorId: user.id,
        assigneeId: user.id,
        parentTaskId: params.id,
        workspaceId: parentTask.workspaceId,
      },
    });

    await logTaskActivity(
      params.id,
      user.id,
      "SUBTASK_ADDED",
      `Added checklist item: "${subtask.title}"`
    );

    return jsonResponse({ subtask }, 201);
  } catch (error: any) {
    console.error("Create subtask error:", error);
    return errorResponse("Failed to create subtask.", 500);
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
    const { subtaskId, status } = await req.json();

    const subtask = await prisma.task.findUnique({
      where: { id: subtaskId },
    });

    if (!subtask || subtask.parentTaskId !== params.id) {
      return errorResponse("Subtask not found.", 404);
    }

    const updated = await prisma.task.update({
      where: { id: subtaskId },
      data: { status },
    });

    return jsonResponse({ subtask: updated });
  } catch (error: any) {
    console.error("Update subtask error:", error);
    return errorResponse("Failed to update subtask.", 500);
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
    const { subtaskId } = await req.json();

    const subtask = await prisma.task.findUnique({
      where: { id: subtaskId },
    });

    if (!subtask || subtask.parentTaskId !== params.id) {
      return errorResponse("Subtask not found.", 404);
    }

    await prisma.task.delete({
      where: { id: subtaskId },
    });

    return jsonResponse({ message: "Subtask deleted." });
  } catch (error: any) {
    console.error("Delete subtask error:", error);
    return errorResponse("Failed to delete subtask.", 500);
  }
}

