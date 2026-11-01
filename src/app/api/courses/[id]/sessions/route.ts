import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const course = await prisma.course.findUnique({
      where: { id: params.id },
    });

    if (!course || course.userId !== user.id) {
      return errorResponse("Course not found.", 404);
    }

    const { startedAt, endedAt, durationMinutes, notes } = await req.json();

    const duration = parseInt(durationMinutes, 10);
    if (isNaN(duration) || duration <= 0) {
      return errorResponse("Study session duration must be a positive number of minutes.");
    }

    if (duration > 1440) {
      return errorResponse("Study session duration cannot exceed 24 hours (1440 minutes).");
    }

    const start = startedAt ? new Date(startedAt) : new Date(Date.now() - duration * 60000);
    const end = endedAt ? new Date(endedAt) : new Date(start.getTime() + duration * 60000);

    if (end < start) {
      return errorResponse("End time cannot be before start time.");
    }

    const session = await prisma.studySession.create({
      data: {
        courseId: params.id,
        userId: user.id,
        startedAt: start,
        endedAt: end,
        durationMinutes: duration,
        notes: notes ? notes.trim() : null,
      },
    });

    return jsonResponse({ session }, 201);
  } catch (error: any) {
    console.error("Log study session error:", error);
    return errorResponse("Failed to log study session.", 500);
  }
}

