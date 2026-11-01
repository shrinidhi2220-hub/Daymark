export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Not authenticated", 401);
    }

    // Get active timer if any
    const activeTimer = await prisma.activeTimer.findUnique({
      where: { userId: user.id },
      include: {
        savedLink: {
          select: {
            id: true,
            title: true,
            url: true,
            category: true,
          },
        },
      },
    });

    // Get unread notifications count
    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    });

    return jsonResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        isEmailVerified: user.isEmailVerified,
        quietHoursStart: user.quietHoursStart,
        quietHoursEnd: user.quietHoursEnd,
        browserNotificationsEnabled: user.browserNotificationsEnabled,
        dashboardCardOrder: user.dashboardCardOrder,
        createdAt: user.createdAt,
      },
      workspaces: user.workspaceMemberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        role: m.role,
        isArchived: m.workspace.isArchived,
      })),
      activeTimer,
      unreadNotificationCount: unreadCount,
    });
  } catch (error: any) {
    console.error("Get me error:", error);
    return errorResponse("Internal server error", 500);
  }
}

