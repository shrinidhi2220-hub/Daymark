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
    const link = await prisma.savedLink.findUnique({
      where: { id: params.id },
      include: {
        dailySessions: {
          orderBy: { startedAt: "desc" },
          take: 30,
        },
      },
    });

    if (!link || link.userId !== user.id) {
      return errorResponse("Saved link not found.", 404);
    }

    return jsonResponse({ link });
  } catch (error: any) {
    console.error("Get saved link error:", error);
    return errorResponse("Failed to fetch saved link.", 500);
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
    const existing = await prisma.savedLink.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.userId !== user.id) {
      return errorResponse("Saved link not found.", 404);
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || body.title.trim().length === 0) {
        return errorResponse("Title cannot be empty.");
      }
      updateData.title = body.title.trim();
    }

    if (body.url !== undefined) {
      if (!isValidHttpUrl(body.url)) {
        return errorResponse("Invalid http/https URL.");
      }
      updateData.url = body.url.trim();
    }

    if (body.description !== undefined) updateData.description = body.description ? body.description.trim() : null;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.customCategory !== undefined) updateData.customCategory = body.customCategory ? body.customCategory.trim() : null;
    if (body.dailyGoalDurationMinutes !== undefined) {
      updateData.dailyGoalDurationMinutes = body.dailyGoalDurationMinutes ? parseInt(body.dailyGoalDurationMinutes, 10) : null;
    }
    if (body.isPinned !== undefined) updateData.isPinned = Boolean(body.isPinned);
    if (body.isArchived !== undefined) updateData.isArchived = Boolean(body.isArchived);

    const updated = await prisma.savedLink.update({
      where: { id: params.id },
      data: updateData,
    });

    return jsonResponse({ link: updated });
  } catch (error: any) {
    console.error("Update saved link error:", error);
    return errorResponse("Failed to update saved link.", 500);
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
    const existing = await prisma.savedLink.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.userId !== user.id) {
      return errorResponse("Saved link not found.", 404);
    }

    // Clean up active timer for this link if any
    await prisma.activeTimer.deleteMany({
      where: { savedLinkId: params.id },
    });

    await prisma.savedLink.delete({
      where: { id: params.id },
    });

    return jsonResponse({ message: "Saved link deleted successfully." });
  } catch (error: any) {
    console.error("Delete saved link error:", error);
    return errorResponse("Failed to delete saved link.", 500);
  }
}

