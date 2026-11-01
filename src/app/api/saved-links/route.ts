export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { isValidHttpUrl } from "@/lib/validations";
import { getDateStringInTimezone, calculateStreak } from "@/lib/date-utils";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const isArchived = searchParams.get("archived") === "true";
    const search = searchParams.get("search")?.trim();

    const where: any = {
      userId: user.id,
      isArchived,
    };

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { url: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const links = await prisma.savedLink.findMany({
      where,
      orderBy: [
        { isPinned: "desc" },
        { sortOrder: "asc" },
        { updatedAt: "desc" },
      ],
      include: {
        dailySessions: {
          orderBy: { sessionDate: "desc" },
          take: 30,
        },
      },
    });

    const todayDateStr = getDateStringInTimezone(new Date(), user.timezone);

    // Compute progress & streaks per link
    const enrichedLinks = links.map((link) => {
      // Find today's session
      const todaySession = link.dailySessions.find(
        (s) => s.sessionDate === todayDateStr
      );
      const isCompletedToday = Boolean(todaySession?.isCompleted);
      const todayDurationSeconds = todaySession?.durationSeconds || 0;

      // Extract unique completion dates
      const completedDates = link.dailySessions
        .filter((s) => s.isCompleted)
        .map((s) => s.sessionDate);

      const { currentStreak, bestStreak } = calculateStreak(completedDates, todayDateStr);

      return {
        ...link,
        isCompletedToday,
        todayDurationSeconds,
        currentStreak,
        bestStreak,
        totalCompletedSessions: completedDates.length,
      };
    });

    // Global streak across all daily goals for the user
    const allUserCompletedSessions = await prisma.dailyGoalSession.findMany({
      where: {
        userId: user.id,
        isCompleted: true,
      },
      select: { sessionDate: true },
    });
    const allDates = allUserCompletedSessions.map((s) => s.sessionDate);
    const globalStreak = calculateStreak(allDates, todayDateStr);

    return jsonResponse({
      links: enrichedLinks,
      globalStreak,
      todayDate: todayDateStr,
    });
  } catch (error: any) {
    console.error("List saved links error:", error);
    return errorResponse("Failed to fetch saved links.", 500);
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
      url,
      description,
      category = "Documentation",
      customCategory,
      dailyGoalDurationMinutes = 30,
      isPinned = false,
    } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return errorResponse("Link title is required.");
    }

    if (!url || !isValidHttpUrl(url)) {
      return errorResponse("A valid http:// or https:// URL is required.");
    }

    const count = await prisma.savedLink.count({
      where: { userId: user.id },
    });

    const link = await prisma.savedLink.create({
      data: {
        userId: user.id,
        title: title.trim(),
        url: url.trim(),
        description: description ? description.trim() : null,
        category,
        customCategory: customCategory ? customCategory.trim() : null,
        dailyGoalDurationMinutes: dailyGoalDurationMinutes
          ? parseInt(dailyGoalDurationMinutes, 10)
          : null,
        isPinned: Boolean(isPinned),
        sortOrder: count,
      },
    });

    return jsonResponse({ link }, 201);
  } catch (error: any) {
    console.error("Create saved link error:", error);
    return errorResponse("Failed to create saved link.", 500);
  }
}

