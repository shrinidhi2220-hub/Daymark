import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { getDateStringInTimezone } from "@/lib/date-utils";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const { savedLinkId, durationMinutes, sessionDate } = await req.json();

    if (!savedLinkId) {
      return errorResponse("savedLinkId is required.");
    }

    const link = await prisma.savedLink.findUnique({
      where: { id: savedLinkId },
    });

    if (!link || link.userId !== user.id) {
      return errorResponse("Saved link not found.", 404);
    }

    const targetDateStr =
      sessionDate || getDateStringInTimezone(new Date(), user.timezone);

    // Prevent duplicate completion records from repeated clicks
    const existing = await prisma.dailyGoalSession.findFirst({
      where: {
        savedLinkId,
        userId: user.id,
        sessionDate: targetDateStr,
      },
    });

    const durationSec = durationMinutes
      ? parseInt(durationMinutes, 10) * 60
      : (link.dailyGoalDurationMinutes || 30) * 60;

    let session;
    if (existing) {
      session = await prisma.dailyGoalSession.update({
        where: { id: existing.id },
        data: {
          isCompleted: true,
          durationSeconds: Math.max(existing.durationSeconds, durationSec),
        },
      });
    } else {
      const now = new Date();
      session = await prisma.dailyGoalSession.create({
        data: {
          savedLinkId,
          userId: user.id,
          sessionDate: targetDateStr,
          startedAt: now,
          endedAt: now,
          durationSeconds: durationSec,
          isCompleted: true,
        },
      });
    }

    return jsonResponse({
      message: "Daily goal marked as completed.",
      session,
    });
  } catch (error: any) {
    console.error("Manual session completion error:", error);
    return errorResponse("Failed to record completion.", 500);
  }
}

