export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const { searchParams } = new URL(req.url);
    const includeCompleted = searchParams.get("completed") === "true";

    const where: any = {
      userId: user.id,
      isDismissed: false,
    };

    if (!includeCompleted) {
      where.isCompleted = false;
    }

    const reminders = await prisma.reminder.findMany({
      where,
      orderBy: { remindAt: "asc" },
    });

    return jsonResponse({ reminders });
  } catch (error: any) {
    console.error("List reminders error:", error);
    return errorResponse("Failed to fetch reminders.", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const body = await req.json();
    const { title, targetType, targetId, remindAt, frequency = "ONCE" } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return errorResponse("Reminder title is required.");
    }

    if (!targetType || !targetId) {
      return errorResponse("Target type and ID are required.");
    }

    if (!remindAt) {
      return errorResponse("Reminder date and time are required.");
    }

    const reminder = await prisma.reminder.create({
      data: {
        userId: user.id,
        title: title.trim(),
        targetType,
        targetId,
        remindAt: new Date(remindAt),
        frequency,
      },
    });

    return jsonResponse({ reminder }, 201);
  } catch (error: any) {
    console.error("Create reminder error:", error);
    return errorResponse("Failed to create reminder.", 500);
  }
}

