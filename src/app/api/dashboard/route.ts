export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { getDateStringInTimezone } from "@/lib/date-utils";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const { searchParams } = new URL(req.url);
    const context = searchParams.get("context") || "all"; // "all" | "personal" | workspaceId
    const daysAhead = parseInt(searchParams.get("days") || "7", 10);

    const userWorkspaceIds = user.workspaceMemberships.map((m) => m.workspaceId);
    const now = new Date();
    const endUpcoming = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const todayDateStr = getDateStringInTimezone(now, user.timezone);

    // Filter tasks based on context
    const taskWhere: any = {
      isArchived: false,
      parentTaskId: null,
    };

    if (context === "personal") {
      taskWhere.workspaceId = null;
      taskWhere.creatorId = user.id;
    } else if (context !== "all") {
      if (!userWorkspaceIds.includes(context)) {
        return errorResponse("Workspace access denied.", 403);
      }
      taskWhere.workspaceId = context;
    } else {
      taskWhere.OR = [
        { workspaceId: null, creatorId: user.id },
        { workspaceId: { in: userWorkspaceIds } },
      ];
    }

    // 1. Fetch tasks
    const allTasks = await prisma.task.findMany({
      where: taskWhere,
      include: {
        workspace: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true } },
        subtasks: { select: { id: true, status: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    const overdueTasks = allTasks.filter(
      (t) => t.dueDate && t.dueDate < now && t.status !== "DONE"
    );

    const todayTasks = allTasks.filter((t) => {
      if (!t.dueDate) return false;
      const dueStr = getDateStringInTimezone(t.dueDate, user.timezone);
      return dueStr === todayDateStr && t.status !== "DONE";
    });

    const upcomingTasks = allTasks.filter((t) => {
      if (!t.dueDate) return false;
      return t.dueDate > now && t.dueDate <= endUpcoming && t.status !== "DONE";
    });

    // 2. Fetch Job Applications & Upcoming Interviews (Personal)
    const applications = await prisma.jobApplication.findMany({
      where: { userId: user.id, isArchived: false },
      include: {
        interviewRounds: {
          where: {
            interviewDate: { gte: now, lte: endUpcoming },
            outcome: "SCHEDULED",
          },
          orderBy: { interviewDate: "asc" },
        },
      },
    });

    const upcomingInterviews = applications.flatMap((app) =>
      app.interviewRounds.map((round) => ({
        ...round,
        companyName: app.companyName,
        roleTitle: app.roleTitle,
      }))
    ).sort((a, b) => a.interviewDate.getTime() - b.interviewDate.getTime());

    const followUpsDue = applications.filter((app) => {
      if (!app.nextFollowUpDate) return false;
      return app.nextFollowUpDate <= endUpcoming;
    });

    // 3. Courses & Next Lessons
    const courses = await prisma.course.findMany({
      where: { userId: user.id, isArchived: false },
      include: {
        lessons: {
          orderBy: { orderIndex: "asc" },
        },
        studySessions: {
          take: 1,
          orderBy: { startedAt: "desc" },
        },
      },
    });

    const coursesOverview = courses.map((c) => {
      const total = c.lessons.length;
      const completed = c.lessons.filter((l) => l.status === "COMPLETE").length;
      const nextLesson = c.lessons.find((l) => l.status !== "COMPLETE");
      return {
        id: c.id,
        name: c.name,
        provider: c.provider,
        status: c.status,
        progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
        completedLessons: completed,
        totalLessons: total,
        nextLesson: nextLesson ? { id: nextLesson.id, title: nextLesson.title } : null,
      };
    });

    // 4. Saved Links Daily Goals & Today's Completion
    const savedLinks = await prisma.savedLink.findMany({
      where: { userId: user.id, isArchived: false },
      include: {
        dailySessions: {
          where: { sessionDate: todayDateStr },
        },
      },
    });

    const goalsOverview = savedLinks.map((link) => {
      const todaySession = link.dailySessions[0];
      return {
        id: link.id,
        title: link.title,
        url: link.url,
        category: link.category,
        dailyGoalDurationMinutes: link.dailyGoalDurationMinutes || 30,
        isCompletedToday: Boolean(todaySession?.isCompleted),
        todayDurationSeconds: todaySession?.durationSeconds || 0,
      };
    });

    // 5. Recent Activity (strictly respecting workspace and user permissions)
    const recentWorkspaceActivities = await prisma.workspaceActivity.findMany({
      where: { workspaceId: { in: userWorkspaceIds } },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true } },
        workspace: { select: { id: true, name: true } },
      },
    });

    const recentJobActivities = await prisma.jobApplicationActivity.findMany({
      where: { jobApplication: { userId: user.id } },
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        jobApplication: { select: { id: true, companyName: true, roleTitle: true } },
      },
    });

    // Combine & sort activities
    const combinedActivity = [
      ...recentWorkspaceActivities.map((wa) => ({
        id: `wa-${wa.id}`,
        type: "workspace",
        title: wa.action.replace(/_/g, " "),
        details: wa.details,
        actor: wa.user.name,
        context: wa.workspace.name,
        timestamp: wa.createdAt,
      })),
      ...recentJobActivities.map((ja) => ({
        id: `ja-${ja.id}`,
        type: "application",
        title: ja.action.replace(/_/g, " "),
        details: `${ja.jobApplication.companyName} — ${ja.details}`,
        actor: user.name,
        context: ja.jobApplication.companyName,
        timestamp: ja.createdAt,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

    return jsonResponse({
      todayDate: todayDateStr,
      timezone: user.timezone,
      cardPreferences: user.dashboardCardOrder.split(","),
      summaryCounts: {
        overdueTasksCount: overdueTasks.length,
        todayTasksCount: todayTasks.length,
        upcomingInterviewsCount: upcomingInterviews.length,
        coursesInProgressCount: courses.filter((c) => c.status === "IN_PROGRESS").length,
        activeApplicationsCount: applications.filter(
          (a) => !["REJECTED", "WITHDRAWN"].includes(a.stage)
        ).length,
      },
      overdueTasks,
      todayTasks,
      upcomingTasks,
      upcomingInterviews,
      followUpsDue,
      coursesOverview,
      goalsOverview,
      recentActivity: combinedActivity,
    });
  } catch (error: any) {
    console.error("Dashboard error:", error);
    return errorResponse("Failed to load dashboard data.", 500);
  }
}

