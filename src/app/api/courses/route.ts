export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { isValidHttpUrl } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const { searchParams } = new URL(req.url);
    const isArchived = searchParams.get("archived") === "true";
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();

    const where: any = {
      userId: user.id,
      isArchived,
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { provider: { contains: search } },
        { subjectCategory: { contains: search } },
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        lessons: {
          select: {
            id: true,
            title: true,
            status: true,
            orderIndex: true,
          },
          orderBy: { orderIndex: "asc" },
        },
        studySessions: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        _count: {
          select: {
            lessons: true,
            studySessions: true,
            linkedTasks: true,
          },
        },
      },
    });

    const coursesWithProgress = courses.map((course) => {
      const totalLessons = course.lessons.length;
      const completedLessons = course.lessons.filter((l) => l.status === "COMPLETE").length;
      const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      const nextLesson = course.lessons.find((l) => l.status !== "COMPLETE") || null;

      return {
        ...course,
        totalLessons,
        completedLessons,
        progressPercent,
        nextLesson,
      };
    });

    return jsonResponse({ courses: coursesWithProgress });
  } catch (error: any) {
    console.error("List courses error:", error);
    return errorResponse("Failed to fetch courses.", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const body = await req.json();
    const {
      name,
      provider,
      subjectCategory,
      courseUrl,
      description,
      targetCompletionDate,
      status = "NOT_STARTED",
      notes,
      questions,
      keyTakeaways,
    } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return errorResponse("Course name is required.");
    }

    if (courseUrl && !isValidHttpUrl(courseUrl)) {
      return errorResponse("Course URL must be a valid http:// or https:// URL.");
    }

    const course = await prisma.course.create({
      data: {
        userId: user.id,
        name: name.trim(),
        provider: provider ? provider.trim() : null,
        subjectCategory: subjectCategory ? subjectCategory.trim() : null,
        courseUrl: courseUrl ? courseUrl.trim() : null,
        description: description ? description.trim() : null,
        targetCompletionDate: targetCompletionDate ? new Date(targetCompletionDate) : null,
        status,
        notes: notes ? notes.trim() : null,
        questions: questions ? questions.trim() : null,
        keyTakeaways: keyTakeaways ? keyTakeaways.trim() : null,
      },
    });

    // Create default section
    await prisma.courseSection.create({
      data: {
        courseId: course.id,
        title: "Course Overview & Content",
        orderIndex: 0,
      },
    });

    return jsonResponse({ course }, 201);
  } catch (error: any) {
    console.error("Create course error:", error);
    return errorResponse("Failed to create course.", 500);
  }
}

