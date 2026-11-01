import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { isValidHttpUrl } from "@/lib/validations";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        sections: {
          orderBy: { orderIndex: "asc" },
          include: {
            lessons: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
        lessons: {
          where: { sectionId: null },
          orderBy: { orderIndex: "asc" },
        },
        studySessions: {
          orderBy: { startedAt: "desc" },
        },
        linkedTasks: {
          select: {
            id: true,
            title: true,
            status: true,
            dueDate: true,
            priority: true,
          },
        },
      },
    });

    if (!course || course.userId !== user.id) {
      return errorResponse("Course not found or access denied.", 404);
    }

    // Calculate total lessons and completed count
    const allLessons = [
      ...course.lessons,
      ...course.sections.flatMap((s) => s.lessons),
    ];
    const totalLessons = allLessons.length;
    const completedLessons = allLessons.filter((l) => l.status === "COMPLETE").length;
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const nextLesson = allLessons.find((l) => l.status !== "COMPLETE") || null;

    return jsonResponse({
      course: {
        ...course,
        totalLessons,
        completedLessons,
        progressPercent,
        nextLesson,
      },
    });
  } catch (error: any) {
    console.error("Get course error:", error);
    return errorResponse("Failed to fetch course.", 500);
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
    const existing = await prisma.course.findUnique({
      where: { id: params.id },
      include: { lessons: true },
    });

    if (!existing || existing.userId !== user.id) {
      return errorResponse("Course not found or access denied.", 404);
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return errorResponse("Course name cannot be empty.");
      }
      updateData.name = body.name.trim();
    }

    if (body.provider !== undefined) updateData.provider = body.provider ? body.provider.trim() : null;
    if (body.subjectCategory !== undefined) updateData.subjectCategory = body.subjectCategory ? body.subjectCategory.trim() : null;
    if (body.description !== undefined) updateData.description = body.description ? body.description.trim() : null;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.questions !== undefined) updateData.questions = body.questions;
    if (body.keyTakeaways !== undefined) updateData.keyTakeaways = body.keyTakeaways;
    if (body.isArchived !== undefined) updateData.isArchived = Boolean(body.isArchived);

    if (body.courseUrl !== undefined) {
      if (body.courseUrl && !isValidHttpUrl(body.courseUrl)) {
        return errorResponse("Invalid course URL.");
      }
      updateData.courseUrl = body.courseUrl ? body.courseUrl.trim() : null;
    }

    if (body.targetCompletionDate !== undefined) {
      updateData.targetCompletionDate = body.targetCompletionDate ? new Date(body.targetCompletionDate) : null;
    }

    if (body.status !== undefined) {
      // Check if user is marking COMPLETE while lessons remain incomplete
      if (body.status === "COMPLETE" && !body.confirmIncompleteOverride) {
        const incompleteCount = await prisma.lesson.count({
          where: {
            courseId: params.id,
            status: { not: "COMPLETE" },
          },
        });
        if (incompleteCount > 0) {
          return errorResponse(
            `This course still has ${incompleteCount} incomplete lesson(s). Please confirm if you wish to override and mark complete.`,
            400,
            { requiresOverrideConfirmation: true, incompleteCount }
          );
        }
      }
      updateData.status = body.status;
    }

    const updated = await prisma.course.update({
      where: { id: params.id },
      data: updateData,
    });

    return jsonResponse({ course: updated });
  } catch (error: any) {
    console.error("Update course error:", error);
    return errorResponse("Failed to update course.", 500);
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
    const existing = await prisma.course.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.userId !== user.id) {
      return errorResponse("Course not found or access denied.", 404);
    }

    await prisma.course.delete({
      where: { id: params.id },
    });

    return jsonResponse({ message: "Course deleted successfully." });
  } catch (error: any) {
    console.error("Delete course error:", error);
    return errorResponse("Failed to delete course.", 500);
  }
}

