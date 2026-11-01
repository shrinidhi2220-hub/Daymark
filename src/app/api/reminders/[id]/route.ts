import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const reminder = await prisma.reminder.findUnique({
      where: { id: params.id },
    });

    if (!reminder || reminder.userId !== user.id) {
      return errorResponse("Reminder not found.", 404);
    }

    const { action, snoozeHours } = await req.json();

    let updateData: any = {};

    if (action === "COMPLETE") {
      updateData = {
        isCompleted: true,
        isSnoozed: false,
        snoozedUntil: null,
      };
    } else if (action === "DISMISS") {
      updateData = {
        isDismissed: true,
      };
    } else if (action === "SNOOZE") {
      const hours = parseInt(snoozeHours || "1", 10);
      const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
      updateData = {
        isSnoozed: true,
        snoozedUntil,
        remindAt: snoozedUntil,
      };
    } else {
      return errorResponse("Invalid action. Expected COMPLETE, DISMISS, or SNOOZE.");
    }

    const updated = await prisma.reminder.update({
      where: { id: params.id },
      data: updateData,
    });

    return jsonResponse({ reminder: updated });
  } catch (error: any) {
    console.error("Update reminder error:", error);
    return errorResponse("Failed to update reminder.", 500);
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
    const reminder = await prisma.reminder.findUnique({
      where: { id: params.id },
    });

    if (!reminder || reminder.userId !== user.id) {
      return errorResponse("Reminder not found.", 404);
    }

    await prisma.reminder.delete({
      where: { id: params.id },
    });

    return jsonResponse({ message: "Reminder deleted." });
  } catch (error: any) {
    console.error("Delete reminder error:", error);
    return errorResponse("Failed to delete reminder.", 500);
  }
}

