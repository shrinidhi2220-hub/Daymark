import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { isValidHttpUrl } from "@/lib/validations";

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

    const { title, resourceUrl, notes, sectionId } = await req.json();

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return errorResponse("Lesson title is required.");
    }

    if (resourceUrl && !isValidHttpUrl(resourceUrl)) {
      return errorResponse("Invalid resource URL.");
    }

    const lessonCount = await prisma.lesson.count({
      where: { courseId: params.id },
    });

    const lesson = await prisma.lesson.create({
      data: {
        courseId: params.id,
        sectionId: sectionId || null,
        title: title.trim(),
        resourceUrl: resourceUrl ? resourceUrl.trim() : null,
        notes: notes ? notes.trim() : null,
        orderIndex: lessonCount,
        status: "NOT_STARTED",
      },
    });

    return jsonResponse({ lesson }, 201);
  } catch (error: any) {
    console.error("Create lesson error:", error);
    return errorResponse("Failed to create lesson.", 500);
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
    const { lessonId, status, title, notes, resourceUrl } = await req.json();

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    });

    if (!lesson || lesson.course.userId !== user.id) {
      return errorResponse("Lesson not found.", 404);
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (notes !== undefined) updateData.notes = notes;
    if (resourceUrl !== undefined) updateData.resourceUrl = resourceUrl ? resourceUrl.trim() : null;

    if (status !== undefined) {
      updateData.status = status;
      if (status === "COMPLETE") {
        updateData.completedAt = new Date();
      } else {
        updateData.completedAt = null;
      }
    }

    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data: updateData,
    });

    // If lesson is marked complete or in-progress and course was NOT_STARTED, move course to IN_PROGRESS
    if (status && status !== "NOT_STARTED" && lesson.course.status === "NOT_STARTED") {
      await prisma.course.update({
        where: { id: params.id },
        data: { status: "IN_PROGRESS" },
      });
    }

    return jsonResponse({ lesson: updated });
  } catch (error: any) {
    console.error("Update lesson error:", error);
    return errorResponse("Failed to update lesson.", 500);
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
    const { lessonId } = await req.json();

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    });

    if (!lesson || lesson.course.userId !== user.id) {
      return errorResponse("Lesson not found.", 404);
    }

    await prisma.lesson.delete({
      where: { id: lessonId },
    });

    return jsonResponse({ message: "Lesson deleted." });
  } catch (error: any) {
    console.error("Delete lesson error:", error);
    return errorResponse("Failed to delete lesson.", 500);
  }
}

