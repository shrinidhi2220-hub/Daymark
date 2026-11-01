export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { hasPermission } from "@/lib/auth";
import { logTaskActivity, logWorkspaceActivity, createNotification } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId"); // "personal" or workspaceId or undefined
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const projectId = searchParams.get("projectId");
    const assigneeId = searchParams.get("assigneeId");
    const isMyTasks = searchParams.get("myTasks") === "true";
    const search = searchParams.get("search")?.trim();
    const isArchived = searchParams.get("archived") === "true";
    const sortBy = searchParams.get("sortBy") || "dueDate";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const userWorkspaceIds = user.workspaceMemberships.map((m) => m.workspaceId);

    const where: any = {
      isArchived,
      parentTaskId: null, // Top-level tasks only in main list
    };

    if (workspaceId === "personal") {
      // Strictly personal tasks created by user
      where.workspaceId = null;
      where.creatorId = user.id;
    } else if (workspaceId && workspaceId !== "all") {
      // Check if user is member of this workspace
      if (!userWorkspaceIds.includes(workspaceId)) {
        return errorResponse("Workspace access denied.", 403);
      }
      where.workspaceId = workspaceId;
    } else {
      // "all" or omitted: return personal tasks + tasks from workspaces user belongs to
      where.OR = [
        { workspaceId: null, creatorId: user.id },
        { workspaceId: { in: userWorkspaceIds } },
      ];
    }

    if (isMyTasks) {
      where.assigneeId = user.id;
    } else if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (priority && priority !== "ALL") {
      where.priority = priority;
    }

    if (search) {
      const searchCondition = [
        { title: { contains: search } },
        { description: { contains: search } },
        { tags: { contains: search } },
      ];
      if (where.OR) {
        where.AND = [{ OR: searchCondition }];
      } else {
        where.OR = searchCondition;
      }
    }

    let orderBy: any = { createdAt: "desc" };
    if (sortBy === "dueDate") {
      orderBy = { dueDate: sortOrder };
    } else if (sortBy === "priority") {
      orderBy = { priority: sortOrder };
    } else if (sortBy === "title") {
      orderBy = { title: sortOrder };
    } else if (sortBy === "status") {
      orderBy = { status: sortOrder };
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy,
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        subtasks: {
          select: { id: true, title: true, status: true },
        },
        linkedJobApplication: { select: { id: true, companyName: true, roleTitle: true } },
        linkedCourse: { select: { id: true, name: true } },
        linkedSavedLink: { select: { id: true, title: true, url: true } },
        _count: {
          select: { comments: true, subtasks: true },
        },
      },
    });

    return jsonResponse({ tasks });
  } catch (error: any) {
    console.error("List tasks error:", error);
    return errorResponse("Failed to fetch tasks.", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const body = await req.json();
    const {
      title,
      description,
      status = "TODO",
      priority = "NORMAL",
      blockerReason,
      dueDate,
      tags,
      recurrenceRule = "NONE",
      workspaceId,
      projectId,
      assigneeId,
      linkedJobApplicationId,
      linkedCourseId,
      linkedSavedLinkId,
      parentTaskId,
    } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return errorResponse("Task title is required.");
    }

    // Require reason if status is BLOCKED
    if (status === "BLOCKED" && (!blockerReason || blockerReason.trim().length === 0)) {
      return errorResponse("A blocker explanation is required when marking a task as Blocked.");
    }

    // Workspace permissions check
    if (workspaceId) {
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: user.id,
          },
        },
      });

      if (!membership || !hasPermission(membership.role, "MEMBER")) {
        return errorResponse("You must be an active workspace member to create tasks in this workspace.", 403);
      }

      // If assignee is specified, verify they belong to the workspace
      if (assigneeId) {
        const assigneeMember = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId,
              userId: assigneeId,
            },
          },
        });
        if (!assigneeMember) {
          return errorResponse("Assignee must be a member of the workspace.", 400);
        }
      }
    } else {
      // Personal task: must be assigned to self or unassigned
      if (assigneeId && assigneeId !== user.id) {
        return errorResponse("Personal tasks cannot be assigned to other users.", 400);
      }
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        status,
        priority,
        blockerReason: status === "BLOCKED" ? blockerReason.trim() : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        tags: tags ? tags.trim() : null,
        recurrenceRule: recurrenceRule || "NONE",
        workspaceId: workspaceId || null,
        projectId: projectId || null,
        creatorId: user.id,
        assigneeId: assigneeId || (workspaceId ? null : user.id),
        parentTaskId: parentTaskId || null,
        linkedJobApplicationId: linkedJobApplicationId || null,
        linkedCourseId: linkedCourseId || null,
        linkedSavedLinkId: linkedSavedLinkId || null,
      },
      include: {
        workspace: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    await logTaskActivity(task.id, user.id, "TASK_CREATED", `Created task "${task.title}"`);

    if (task.workspaceId) {
      await logWorkspaceActivity(
        task.workspaceId,
        user.id,
        "TASK_CREATED",
        `Created shared task "${task.title}"`
      );
    }

    // Send assignment notification if assigned to someone else
    if (task.assigneeId && task.assigneeId !== user.id) {
      await createNotification({
        userId: task.assigneeId,
        title: "New task assigned to you",
        message: `${user.name} assigned you the task: "${task.title}"`,
        type: "ASSIGNMENT",
        linkUrl: `/tasks?selected=${task.id}`,
      });
    }

    // Create due date reminder if due date is set
    if (task.dueDate) {
      await prisma.reminder.create({
        data: {
          userId: user.id,
          title: `Task due: ${task.title}`,
          targetType: "TASK",
          targetId: task.id,
          remindAt: new Date(task.dueDate),
          frequency: "ONCE",
        },
      });
    }

    return jsonResponse({ task }, 201);
  } catch (error: any) {
    console.error("Create task error:", error);
    return errorResponse("Failed to create task.", 500);
  }
}

