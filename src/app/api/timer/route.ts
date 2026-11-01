import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
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

    if (!activeTimer) {
      return jsonResponse({ activeTimer: null });
    }

    const now = new Date();
    let currentElapsedSeconds = activeTimer.accumulatedSeconds;

    if (!activeTimer.isPaused) {
      const segmentElapsed = Math.floor(
        (now.getTime() - activeTimer.startedAt.getTime()) / 1000
      );
      currentElapsedSeconds += Math.max(0, segmentElapsed);
    }

    return jsonResponse({
      activeTimer: {
        id: activeTimer.id,
        savedLinkId: activeTimer.savedLinkId,
        savedLink: activeTimer.savedLink,
        isPaused: activeTimer.isPaused,
        startedAt: activeTimer.startedAt,
        targetSeconds: activeTimer.targetSeconds,
        elapsedSeconds: currentElapsedSeconds,
        progressPercent: Math.min(
          100,
          Math.round((currentElapsedSeconds / activeTimer.targetSeconds) * 100)
        ),
      },
    });
  } catch (error: any) {
    console.error("Get timer error:", error);
    return errorResponse("Failed to fetch timer state.", 500);
  }
}

