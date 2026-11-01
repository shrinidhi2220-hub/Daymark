import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { hasPermission } from "@/lib/auth";
import { logTaskActivity, createNotification } from "@/lib/activity";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        workspace: {
          include: {
            members: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!task) {
      return errorResponse("Task not found.", 404);
    }

    if (task.workspaceId) {
      const isMember = task.workspace?.members.some((m) => m.userId === user.id);
      if (!isMember) {
        return errorResponse("Access denied.", 403);
      }
    } else {
      if (task.creatorId !== user.id && task.assigneeId !== user.id) {
        return errorResponse("Access denied.", 403);
      }
    }

    const { content, mentions } = await req.json();

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return errorResponse("Comment content cannot be empty.");
    }

    // Filter mentions strictly to workspace members if task is in a workspace
    const validMentionIds: string[] = [];
    if (task.workspaceId && Array.isArray(mentions)) {
      const allowedMemberIds = new Set(task.workspace?.members.map((m) => m.userId));
      for (const mId of mentions) {
        if (allowedMemberIds.has(mId) && mId !== user.id) {
          validMentionIds.push(mId);
        }
      }
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId: params.id,
        authorId: user.id,
        content: content.trim(),
        mentions: validMentionIds.length > 0 ? JSON.stringify(validMentionIds) : null,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await logTaskActivity(
      params.id,
      user.id,
      "COMMENT_ADDED",
      `${user.name} commented on this task`
    );

    // Notify mentioned users
    for (const mentionedUserId of validMentionIds) {
      await createNotification({
        userId: mentionedUserId,
        title: `Mentioned in "${task.title}"`,
        message: `${user.name} mentioned you in a comment: "${content.trim().slice(0, 80)}..."`,
        type: "MENTION",
        linkUrl: `/tasks?selected=${task.id}`,
      });
    }

    // Notify task assignee if not the commenter and not already mentioned
    if (
      task.assigneeId &&
      task.assigneeId !== user.id &&
      !validMentionIds.includes(task.assigneeId)
    ) {
      await createNotification({
        userId: task.assigneeId,
        title: `New comment on your task "${task.title}"`,
        message: `${user.name}: "${content.trim().slice(0, 80)}..."`,
        type: "INFO",
        linkUrl: `/tasks?selected=${task.id}`,
      });
    }

    return jsonResponse({ comment }, 201);
  } catch (error: any) {
    console.error("Create comment error:", error);
    return errorResponse("Failed to post comment.", 500);
  }
}

