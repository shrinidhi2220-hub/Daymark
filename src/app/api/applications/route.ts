export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { isValidHttpUrl } from "@/lib/validations";
import { logJobApplicationActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const stage = searchParams.get("stage")?.trim();
    const isArchived = searchParams.get("archived") === "true";
    const sortBy = searchParams.get("sortBy") || "updatedAt"; // company, stage, date, nextAction, updatedAt
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const where: any = {
      userId: user.id,
      isArchived,
    };

    if (stage && stage !== "ALL") {
      where.stage = stage;
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { roleTitle: { contains: search } },
        { location: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    let orderBy: any = { updatedAt: "desc" };
    if (sortBy === "company") {
      orderBy = { companyName: sortOrder };
    } else if (sortBy === "stage") {
      orderBy = { stage: sortOrder };
    } else if (sortBy === "date") {
      orderBy = { applicationDate: sortOrder };
    } else if (sortBy === "nextAction") {
      orderBy = { nextFollowUpDate: sortOrder };
    } else {
      orderBy = { updatedAt: sortOrder };
    }

    const applications = await prisma.jobApplication.findMany({
      where,
      orderBy,
      include: {
        interviewRounds: {
          orderBy: { interviewDate: "asc" },
        },
        _count: {
          select: {
            interviewRounds: true,
            linkedTasks: true,
          },
        },
      },
    });

    // Compute stage counts for quick tabs
    const allUserApps = await prisma.jobApplication.findMany({
      where: { userId: user.id },
      select: { stage: true, isArchived: true },
    });

    const stageCounts: Record<string, number> = {
      ALL: 0,
      SAVED: 0,
      PREPARING: 0,
      APPLIED: 0,
      INTERVIEWING: 0,
      OFFER: 0,
      REJECTED: 0,
      WITHDRAWN: 0,
      ARCHIVED: 0,
    };

    allUserApps.forEach((app) => {
      if (app.isArchived) {
        stageCounts.ARCHIVED++;
      } else {
        stageCounts.ALL++;
        if (stageCounts[app.stage] !== undefined) {
          stageCounts[app.stage]++;
        }
      }
    });

    return jsonResponse({ applications, stageCounts });
  } catch (error: any) {
    console.error("List applications error:", error);
    return errorResponse("Failed to fetch applications.", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const body = await req.json();
    const {
      companyName,
      roleTitle,
      jobUrl,
      jobDescription,
      location,
      workArrangement = "NOT_SPECIFIED",
      employmentType = "FULL_TIME",
      salaryRange,
      currency = "USD",
      dateFound,
      applicationDate,
      contactName,
      contactDetails,
      notes,
      nextFollowUpDate,
      resumeUrl,
      resumeVersion,
      coverLetterUrl,
      coverLetterVersion,
      stage = "SAVED",
    } = body;

    if (!companyName || typeof companyName !== "string" || companyName.trim().length === 0) {
      return errorResponse("Company name is required.");
    }

    if (!roleTitle || typeof roleTitle !== "string" || roleTitle.trim().length === 0) {
      return errorResponse("Role / title is required.");
    }

    if (jobUrl && !isValidHttpUrl(jobUrl)) {
      return errorResponse("Job listing URL must be a valid http:// or https:// URL.");
    }

    if (resumeUrl && !isValidHttpUrl(resumeUrl)) {
      return errorResponse("Resume link must be a valid http:// or https:// URL.");
    }

    if (coverLetterUrl && !isValidHttpUrl(coverLetterUrl)) {
      return errorResponse("Cover letter link must be a valid http:// or https:// URL.");
    }

    const application = await prisma.jobApplication.create({
      data: {
        userId: user.id,
        companyName: companyName.trim(),
        roleTitle: roleTitle.trim(),
        jobUrl: jobUrl ? jobUrl.trim() : null,
        jobDescription: jobDescription ? jobDescription.trim() : null,
        location: location ? location.trim() : null,
        workArrangement,
        employmentType,
        salaryRange: salaryRange ? salaryRange.trim() : null,
        currency: currency.trim() || "USD",
        dateFound: dateFound ? new Date(dateFound) : null,
        applicationDate: applicationDate ? new Date(applicationDate) : null,
        contactName: contactName ? contactName.trim() : null,
        contactDetails: contactDetails ? contactDetails.trim() : null,
        notes: notes ? notes.trim() : null,
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
        resumeUrl: resumeUrl ? resumeUrl.trim() : null,
        resumeVersion: resumeVersion ? resumeVersion.trim() : null,
        coverLetterUrl: coverLetterUrl ? coverLetterUrl.trim() : null,
        coverLetterVersion: coverLetterVersion ? coverLetterVersion.trim() : null,
        stage,
      },
    });

    await logJobApplicationActivity(
      application.id,
      "APPLICATION_CREATED",
      `Created application for ${application.roleTitle} at ${application.companyName} (${application.stage})`
    );

    // If follow-up date is set, create a reminder
    if (nextFollowUpDate) {
      await prisma.reminder.create({
        data: {
          userId: user.id,
          title: `Follow up with ${application.companyName} (${application.roleTitle})`,
          targetType: "FOLLOW_UP",
          targetId: application.id,
          remindAt: new Date(nextFollowUpDate),
          frequency: "ONCE",
        },
      });
    }

    return jsonResponse({ application }, 201);
  } catch (error: any) {
    console.error("Create application error:", error);
    return errorResponse("Failed to create application.", 500);
  }
}

