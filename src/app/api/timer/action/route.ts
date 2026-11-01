import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { getDateStringInTimezone } from "@/lib/date-utils";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const { action, savedLinkId } = await req.json();
    const now = new Date();

    if (action === "START") {
      if (!savedLinkId) {
        return errorResponse("savedLinkId is required to start a timer.");
      }

      const link = await prisma.savedLink.findUnique({
        where: { id: savedLinkId },
      });

      if (!link || link.userId !== user.id) {
        return errorResponse("Saved link not found.", 404);
      }

      const targetSeconds = (link.dailyGoalDurationMinutes || 30) * 60;

      // Upsert: only 1 active timer per user
      const timer = await prisma.activeTimer.upsert({
        where: { userId: user.id },
        update: {
          savedLinkId,
          startedAt: now,
          accumulatedSeconds: 0,
          isPaused: false,
          pausedAt: null,
          targetSeconds,
        },
        create: {
          userId: user.id,
          savedLinkId,
          startedAt: now,
          accumulatedSeconds: 0,
          isPaused: false,
          targetSeconds,
        },
        include: { savedLink: true },
      });

      return jsonResponse({
        message: "Timer started.",
        timer: {
          ...timer,
          elapsedSeconds: 0,
        },
      });
    }

    // For PAUSE, RESUME, FINISH, DISCARD: requires existing active timer
    const existing = await prisma.activeTimer.findUnique({
      where: { userId: user.id },
      include: { savedLink: true },
    });

    if (!existing) {
      return errorResponse("No active timer found.", 404);
    }

    if (action === "PAUSE") {
      if (existing.isPaused) {
        return jsonResponse({ timer: existing });
      }

      const segmentElapsed = Math.floor(
        (now.getTime() - existing.startedAt.getTime()) / 1000
      );
      const newAccumulated = existing.accumulatedSeconds + Math.max(0, segmentElapsed);

      const updated = await prisma.activeTimer.update({
        where: { userId: user.id },
        data: {
          accumulatedSeconds: newAccumulated,
          isPaused: true,
          pausedAt: now,
        },
        include: { savedLink: true },
      });

      return jsonResponse({
        message: "Timer paused.",
        timer: {
          ...updated,
          elapsedSeconds: newAccumulated,
        },
      });
    }

    if (action === "RESUME") {
      if (!existing.isPaused) {
        return jsonResponse({ timer: existing });
      }

      const updated = await prisma.activeTimer.update({
        where: { userId: user.id },
        data: {
          startedAt: now,
          isPaused: false,
          pausedAt: null,
        },
        include: { savedLink: true },
      });

      return jsonResponse({
        message: "Timer resumed.",
        timer: {
          ...updated,
          elapsedSeconds: existing.accumulatedSeconds,
        },
      });
    }

    if (action === "FINISH") {
      let finalElapsed = existing.accumulatedSeconds;
      if (!existing.isPaused) {
        const segment = Math.floor((now.getTime() - existing.startedAt.getTime()) / 1000);
        finalElapsed += Math.max(0, segment);
      }

      const todayDateStr = getDateStringInTimezone(now, user.timezone);

      // Record daily goal session (or update today's session)
      const existingSession = await prisma.dailyGoalSession.findFirst({
        where: {
          savedLinkId: existing.savedLinkId,
          userId: user.id,
          sessionDate: todayDateStr,
        },
      });

      if (existingSession) {
        await prisma.dailyGoalSession.update({
          where: { id: existingSession.id },
          data: {
            durationSeconds: existingSession.durationSeconds + finalElapsed,
            isCompleted: true,
            endedAt: now,
          },
        });
      } else {
        await prisma.dailyGoalSession.create({
          data: {
            savedLinkId: existing.savedLinkId,
            userId: user.id,
            startedAt: existing.startedAt,
            endedAt: now,
            durationSeconds: finalElapsed,
            isCompleted: true,
            sessionDate: todayDateStr,
          },
        });
      }

      // Remove active timer
      await prisma.activeTimer.delete({
        where: { userId: user.id },
      });

      // Notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: "Daily Goal Completed!",
          message: `Completed daily goal session for "${existing.savedLink.title}".`,
          type: "SUCCESS",
          linkUrl: "/saved-links",
        },
      });

      return jsonResponse({
        message: "Session finished and recorded successfully.",
        totalElapsedSeconds: finalElapsed,
      });
    }

    if (action === "DISCARD") {
      await prisma.activeTimer.delete({
        where: { userId: user.id },
      });
      return jsonResponse({ message: "Timer session discarded." });
    }

    return errorResponse("Invalid timer action. Expected START, PAUSE, RESUME, FINISH, or DISCARD.");
  } catch (error: any) {
    console.error("Timer action error:", error);
    return errorResponse("Failed to update timer.", 500);
  }
}

