import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { isValidHttpUrl } from "@/lib/validations";
import { logJobApplicationActivity } from "@/lib/activity";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const application = await prisma.jobApplication.findUnique({
      where: { id: params.id },
      include: {
        interviewRounds: {
          orderBy: { interviewDate: "asc" },
        },
        activities: {
          orderBy: { createdAt: "desc" },
        },
        linkedTasks: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
          },
        },
      },
    });

    if (!application || application.userId !== user.id) {
      return errorResponse("Application not found or access denied.", 404);
    }

    return jsonResponse({ application });
  } catch (error: any) {
    console.error("Get application error:", error);
    return errorResponse("Failed to fetch application.", 500);
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
    const existing = await prisma.jobApplication.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.userId !== user.id) {
      return errorResponse("Application not found or access denied.", 404);
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.companyName !== undefined) updateData.companyName = body.companyName.trim();
    if (body.roleTitle !== undefined) updateData.roleTitle = body.roleTitle.trim();

    if (body.jobUrl !== undefined) {
      if (body.jobUrl && !isValidHttpUrl(body.jobUrl)) {
        return errorResponse("Invalid job listing URL.");
      }
      updateData.jobUrl = body.jobUrl ? body.jobUrl.trim() : null;
    }

    if (body.resumeUrl !== undefined) {
      if (body.resumeUrl && !isValidHttpUrl(body.resumeUrl)) {
        return errorResponse("Invalid resume URL.");
      }
      updateData.resumeUrl = body.resumeUrl ? body.resumeUrl.trim() : null;
    }

    if (body.coverLetterUrl !== undefined) {
      if (body.coverLetterUrl && !isValidHttpUrl(body.coverLetterUrl)) {
        return errorResponse("Invalid cover letter URL.");
      }
      updateData.coverLetterUrl = body.coverLetterUrl ? body.coverLetterUrl.trim() : null;
    }

    if (body.jobDescription !== undefined) updateData.jobDescription = body.jobDescription;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.workArrangement !== undefined) updateData.workArrangement = body.workArrangement;
    if (body.employmentType !== undefined) updateData.employmentType = body.employmentType;
    if (body.salaryRange !== undefined) updateData.salaryRange = body.salaryRange;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.contactName !== undefined) updateData.contactName = body.contactName;
    if (body.contactDetails !== undefined) updateData.contactDetails = body.contactDetails;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.resumeVersion !== undefined) updateData.resumeVersion = body.resumeVersion;
    if (body.coverLetterVersion !== undefined) updateData.coverLetterVersion = body.coverLetterVersion;
    if (body.isArchived !== undefined) updateData.isArchived = Boolean(body.isArchived);

    if (body.dateFound !== undefined) {
      updateData.dateFound = body.dateFound ? new Date(body.dateFound) : null;
    }
    if (body.applicationDate !== undefined) {
      updateData.applicationDate = body.applicationDate ? new Date(body.applicationDate) : null;
    }
    if (body.nextFollowUpDate !== undefined) {
      updateData.nextFollowUpDate = body.nextFollowUpDate ? new Date(body.nextFollowUpDate) : null;
    }

    if (body.stage !== undefined && body.stage !== existing.stage) {
      updateData.stage = body.stage;
      await logJobApplicationActivity(
        params.id,
        "STAGE_CHANGED",
        `Stage changed from ${existing.stage} to ${body.stage}`
      );
    }

    if (body.isArchived !== undefined && body.isArchived !== existing.isArchived) {
      await logJobApplicationActivity(
        params.id,
        body.isArchived ? "APPLICATION_ARCHIVED" : "APPLICATION_RESTORED",
        body.isArchived ? "Archived application" : "Restored application"
      );
    }

    const updated = await prisma.jobApplication.update({
      where: { id: params.id },
      data: updateData,
    });

    return jsonResponse({ application: updated });
  } catch (error: any) {
    console.error("Update application error:", error);
    return errorResponse("Failed to update application.", 500);
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
    const existing = await prisma.jobApplication.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.userId !== user.id) {
      return errorResponse("Application not found or access denied.", 404);
    }

    // Delete associated reminders and application
    await prisma.$transaction([
      prisma.reminder.deleteMany({
        where: {
          userId: user.id,
          targetType: "FOLLOW_UP",
          targetId: params.id,
        },
      }),
      prisma.jobApplication.delete({
        where: { id: params.id },
      }),
    ]);

    return jsonResponse({ message: "Job application deleted successfully." });
  } catch (error: any) {
    console.error("Delete application error:", error);
    return errorResponse("Failed to delete application.", 500);
  }
}

