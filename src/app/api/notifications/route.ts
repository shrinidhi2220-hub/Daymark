export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    });

    return jsonResponse({ notifications, unreadCount });
  } catch (error: any) {
    console.error("List notifications error:", error);
    return errorResponse("Failed to fetch notifications.", 500);
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const { notificationId, markAllRead } = await req.json();

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          isRead: false,
        },
        data: { isRead: true },
      });
      return jsonResponse({ message: "All notifications marked as read." });
    }

    if (!notificationId) {
      return errorResponse("notificationId or markAllRead is required.");
    }

    const updated = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: user.id,
      },
      data: { isRead: true },
    });

    return jsonResponse({ message: "Notification marked as read." });
  } catch (error: any) {
    console.error("Update notification error:", error);
    return errorResponse("Failed to update notification.", 500);
  }
}

