import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, errorResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const [
      applications,
      courses,
      savedLinks,
      dailySessions,
      personalTasks,
      reminders,
      notifications,
    ] = await Promise.all([
      prisma.jobApplication.findMany({
        where: { userId: user.id },
        include: {
          interviewRounds: true,
          activities: true,
        },
      }),
      prisma.course.findMany({
        where: { userId: user.id },
        include: {
          sections: {
            include: {
              lessons: true,
            },
          },
          studySessions: true,
        },
      }),
      prisma.savedLink.findMany({
        where: { userId: user.id },
      }),
      prisma.dailyGoalSession.findMany({
        where: { userId: user.id },
      }),
      prisma.task.findMany({
        where: {
          creatorId: user.id,
          workspaceId: null, // Personal tasks
        },
        include: {
          subtasks: true,
          comments: true,
        },
      }),
      prisma.reminder.findMany({
        where: { userId: user.id },
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
      }),
    ]);

    const exportPayload = {
      exportVersion: "1.0",
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
      jobApplications: applications,
      courses,
      savedLinks,
      dailyGoalSessions: dailySessions,
      personalTasks,
      reminders,
      notifications,
    };

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="daymark-export-${user.id}-${Date.now()}.json"`,
      },
    });
  } catch (error: any) {
    console.error("Data export error:", error);
    return errorResponse("Failed to generate data export.", 500);
  }
}

