import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { logJobApplicationActivity } from "@/lib/activity";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const application = await prisma.jobApplication.findUnique({
      where: { id: params.id },
    });

    if (!application || application.userId !== user.id) {
      return errorResponse("Application not found.", 404);
    }

    const body = await req.json();
    const {
      roundTitle,
      interviewDate,
      timezone = "UTC",
      format = "Video (Google Meet)",
      interviewer,
      preparationNotes,
      outcome = "SCHEDULED",
    } = body;

    if (!roundTitle || typeof roundTitle !== "string" || roundTitle.trim().length === 0) {
      return errorResponse("Interview round title is required.");
    }

    if (!interviewDate) {
      return errorResponse("Interview date and time are required.");
    }

    const roundDate = new Date(interviewDate);
    if (isNaN(roundDate.getTime())) {
      return errorResponse("Invalid interview date.");
    }

    const round = await prisma.interviewRound.create({
      data: {
        jobApplicationId: params.id,
        roundTitle: roundTitle.trim(),
        interviewDate: roundDate,
        timezone: timezone.trim(),
        format: format.trim(),
        interviewer: interviewer ? interviewer.trim() : null,
        preparationNotes: preparationNotes ? preparationNotes.trim() : null,
        outcome,
      },
    });

    // Automatically transition application stage to INTERVIEWING if it was SAVED, PREPARING, or APPLIED
    if (["SAVED", "PREPARING", "APPLIED"].includes(application.stage)) {
      await prisma.jobApplication.update({
        where: { id: params.id },
        data: { stage: "INTERVIEWING" },
      });
    }

    await logJobApplicationActivity(
      params.id,
      "INTERVIEW_SCHEDULED",
      `Scheduled ${round.roundTitle} on ${round.interviewDate.toLocaleDateString()}`
    );

    // Create reminder for the interview
    await prisma.reminder.create({
      data: {
        userId: user.id,
        title: `${round.roundTitle} (${application.companyName})`,
        targetType: "INTERVIEW",
        targetId: round.id,
        remindAt: new Date(roundDate.getTime() - 60 * 60 * 1000), // 1 hour prior
        frequency: "ONCE",
      },
    });

    return jsonResponse({ round }, 201);
  } catch (error: any) {
    console.error("Create interview round error:", error);
    return errorResponse("Failed to schedule interview round.", 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const { roundId, roundTitle, interviewDate, timezone, format, interviewer, preparationNotes, outcome } = await req.json();

    const round = await prisma.interviewRound.findUnique({
      where: { id: roundId },
      include: { jobApplication: true },
    });

    if (!round || round.jobApplication.userId !== user.id) {
      return errorResponse("Interview round not found.", 404);
    }

    const updateData: any = {};
    if (roundTitle !== undefined) updateData.roundTitle = roundTitle.trim();
    if (interviewDate !== undefined) updateData.interviewDate = new Date(interviewDate);
    if (timezone !== undefined) updateData.timezone = timezone.trim();
    if (format !== undefined) updateData.format = format.trim();
    if (interviewer !== undefined) updateData.interviewer = interviewer ? interviewer.trim() : null;
    if (preparationNotes !== undefined) updateData.preparationNotes = preparationNotes ? preparationNotes.trim() : null;
    if (outcome !== undefined) updateData.outcome = outcome;

    const updated = await prisma.interviewRound.update({
      where: { id: roundId },
      data: updateData,
    });

    await logJobApplicationActivity(
      round.jobApplicationId,
      "INTERVIEW_UPDATED",
      `Updated ${updated.roundTitle} (Status: ${updated.outcome})`
    );

    return jsonResponse({ round: updated });
  } catch (error: any) {
    console.error("Update interview round error:", error);
    return errorResponse("Failed to update interview round.", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const { roundId } = await req.json();

    const round = await prisma.interviewRound.findUnique({
      where: { id: roundId },
      include: { jobApplication: true },
    });

    if (!round || round.jobApplication.userId !== user.id) {
      return errorResponse("Interview round not found.", 404);
    }

    await prisma.$transaction([
      prisma.reminder.deleteMany({
        where: {
          targetType: "INTERVIEW",
          targetId: roundId,
        },
      }),
      prisma.interviewRound.delete({
        where: { id: roundId },
      }),
    ]);

    await logJobApplicationActivity(
      round.jobApplicationId,
      "INTERVIEW_REMOVED",
      `Deleted ${round.roundTitle}`
    );

    return jsonResponse({ message: "Interview round removed." });
  } catch (error: any) {
    console.error("Delete interview round error:", error);
    return errorResponse("Failed to delete interview round.", 500);
  }
}

