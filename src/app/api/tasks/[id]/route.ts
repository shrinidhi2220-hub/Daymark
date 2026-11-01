import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { hasPermission } from "@/lib/auth";
import { logTaskActivity, logWorkspaceActivity, createNotification } from "@/lib/activity";

async function verifyTaskAccess(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      workspace: true,
      project: true,
      creator: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      subtasks: {
        orderBy: { createdAt: "asc" },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      linkedJobApplication: { select: { id: true, companyName: true, roleTitle: true } },
      linkedCourse: { select: { id: true, name: true } },
      linkedSavedLink: { select: { id: true, title: true, url: true } },
    },
  });

  if (!task) return null;

  if (task.workspaceId) {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: task.workspaceId,
          userId,
        },
      },
    });
    if (!member) return null;
    return { task, memberRole: member.role };
  } else {
    // Personal task: only creator or assignee can view
    if (task.creatorId !== userId && task.assigneeId !== userId) {
      return null;
    }
    return { task, memberRole: "OWNER" };
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const access = await verifyTaskAccess(params.id, user.id);
    if (!access) {
      return errorResponse("Task not found or access denied.", 404);
    }

    return jsonResponse({
      task: access.task,
      canEdit: hasPermission(access.memberRole, "MEMBER"),
    });
  } catch (error: any) {
    console.error("Get task error:", error);
    return errorResponse("Failed to fetch task.", 500);
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
    const access = await verifyTaskAccess(params.id, user.id);
    if (!access) {
      return errorResponse("Task not found or access denied.", 404);
    }

    if (!hasPermission(access.memberRole, "MEMBER")) {
      return errorResponse("Viewer role cannot modify tasks.", 403);
    }

    const { task } = access;
    const body = await req.json();
    const updateData: any = {};

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || body.title.trim().length === 0) {
        return errorResponse("Task title cannot be empty.");
      }
      updateData.title = body.title.trim();
    }

    if (body.description !== undefined) {
      updateData.description = body.description ? body.description.trim() : null;
    }

    if (body.priority !== undefined) {
      updateData.priority = body.priority;
    }

    if (body.tags !== undefined) {
      updateData.tags = body.tags ? body.tags.trim() : null;
    }

    if (body.dueDate !== undefined) {
      updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }

    if (body.recurrenceRule !== undefined) {
      updateData.recurrenceRule = body.recurrenceRule;
    }

    if (body.projectId !== undefined) {
      updateData.projectId = body.projectId || null;
    }

    if (body.isArchived !== undefined) {
      updateData.isArchived = Boolean(body.isArchived);
    }

    // Assignee change
    if (body.assigneeId !== undefined && body.assigneeId !== task.assigneeId) {
      if (task.workspaceId && body.assigneeId) {
        const targetMember = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: task.workspaceId,
              userId: body.assigneeId,
            },
          },
          include: { user: { select: { name: true } } },
        });

        if (!targetMember) {
          return errorResponse("Assignee must be a member of this workspace.", 400);
        }

        updateData.assigneeId = body.assigneeId;
        await logTaskActivity(
          task.id,
          user.id,
          "TASK_REASSIGNED",
          `Reassigned to ${targetMember.user.name}`
        );

        if (body.assigneeId !== user.id) {
          await createNotification({
            userId: body.assigneeId,
            title: "Task assigned to you",
            message: `${user.name} assigned you the task: "${task.title}"`,
            type: "ASSIGNMENT",
            linkUrl: `/tasks?selected=${task.id}`,
          });
        }
      } else {
        updateData.assigneeId = body.assigneeId || null;
      }
    }

    // Status change and Blocker logic
    if (body.status !== undefined && body.status !== task.status) {
      const newStatus = body.status;

      if (newStatus === "BLOCKED") {
        const blocker = body.blockerReason || task.blockerReason;
        if (!blocker || blocker.trim().length === 0) {
          return errorResponse("A blocker explanation is required when setting status to Blocked.");
        }
        updateData.status = "BLOCKED";
        updateData.blockerReason = blocker.trim();
        await logTaskActivity(
          task.id,
          user.id,
          "TASK_BLOCKED",
          `Blocked: ${blocker.trim()}`
        );
      } else {
        updateData.status = newStatus;
        if (task.status === "BLOCKED") {
          // Clearing blocked status
          updateData.blockerReason = null;
          await logTaskActivity(
            task.id,
            user.id,
            "TASK_UNBLOCKED",
            `Unblocked task (Status changed to ${newStatus})`
          );
        } else {
          await logTaskActivity(
            task.id,
            user.id,
            "STATUS_CHANGED",
            `Status changed from ${task.status} to ${newStatus}`
          );
        }

        // Handle Recurring tasks when marked DONE
        if (newStatus === "DONE" && task.recurrenceRule && task.recurrenceRule !== "NONE") {
          const rule = task.recurrenceRule;
          const now = new Date();
          let nextDueDate = task.dueDate ? new Date(task.dueDate) : new Date();

          if (rule === "DAILY") {
            nextDueDate.setDate(nextDueDate.getDate() + 1);
          } else if (rule === "WEEKLY") {
            nextDueDate.setDate(nextDueDate.getDate() + 7);
          } else if (rule === "MONTHLY") {
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          }

          // Safe recurrence: create next occurrence
          await prisma.task.create({
            data: {
              title: task.title,
              description: task.description,
              status: "TODO",
              priority: task.priority,
              dueDate: nextDueDate,
              tags: task.tags,
              recurrenceRule: task.recurrenceRule,
              workspaceId: task.workspaceId,
              projectId: task.projectId,
              creatorId: task.creatorId,
              assigneeId: task.assigneeId,
              linkedJobApplicationId: task.linkedJobApplicationId,
              linkedCourseId: task.linkedCourseId,
              linkedSavedLinkId: task.linkedSavedLinkId,
            },
          });
        }
      }
    } else if (body.blockerReason !== undefined) {
      updateData.blockerReason = body.blockerReason ? body.blockerReason.trim() : null;
    }

    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: updateData,
      include: {
        workspace: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    return jsonResponse({ task: updatedTask });
  } catch (error: any) {
    console.error("Update task error:", error);
    return errorResponse("Failed to update task.", 500);
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
    const access = await verifyTaskAccess(params.id, user.id);
    if (!access) {
      return errorResponse("Task not found or access denied.", 404);
    }

    if (!hasPermission(access.memberRole, "MEMBER")) {
      return errorResponse("Viewer role cannot delete tasks.", 403);
    }

    // Delete subtasks, comments, activity, and task
    await prisma.$transaction([
      prisma.taskActivity.deleteMany({ where: { taskId: params.id } }),
      prisma.taskComment.deleteMany({ where: { taskId: params.id } }),
      prisma.task.deleteMany({ where: { parentTaskId: params.id } }),
      prisma.reminder.deleteMany({
        where: { targetType: "TASK", targetId: params.id },
      }),
      prisma.task.delete({ where: { id: params.id } }),
    ]);

    return jsonResponse({ message: "Task deleted successfully." });
  } catch (error: any) {
    console.error("Delete task error:", error);
    return errorResponse("Failed to delete task.", 500);
  }
}

