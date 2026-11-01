import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { isValidEmail } from "@/lib/validations";

export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const body = await req.json();
    const {
      name,
      email,
      timezone,
      quietHoursStart,
      quietHoursEnd,
      browserNotificationsEnabled,
      dashboardCardOrder,
    } = body;

    const updateData: any = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return errorResponse("Name cannot be empty.");
      }
      updateData.name = name.trim();
    }

    if (email !== undefined && email !== user.email) {
      if (!isValidEmail(email)) {
        return errorResponse("Please provide a valid email address.");
      }
      const existing = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
      if (existing && existing.id !== user.id) {
        return errorResponse("This email address is already in use by another account.");
      }
      updateData.email = email.trim().toLowerCase();
      updateData.isEmailVerified = false; // Requires re-verification if email changed
    }

    if (timezone !== undefined) {
      updateData.timezone = timezone;
    }

    if (quietHoursStart !== undefined) {
      updateData.quietHoursStart = quietHoursStart;
    }

    if (quietHoursEnd !== undefined) {
      updateData.quietHoursEnd = quietHoursEnd;
    }

    if (browserNotificationsEnabled !== undefined) {
      updateData.browserNotificationsEnabled = Boolean(browserNotificationsEnabled);
    }

    if (dashboardCardOrder !== undefined) {
      updateData.dashboardCardOrder = typeof dashboardCardOrder === "string"
        ? dashboardCardOrder
        : Array.isArray(dashboardCardOrder)
        ? dashboardCardOrder.join(",")
        : user.dashboardCardOrder;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return jsonResponse({
      message: "Profile updated successfully.",
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        timezone: updated.timezone,
        isEmailVerified: updated.isEmailVerified,
        quietHoursStart: updated.quietHoursStart,
        quietHoursEnd: updated.quietHoursEnd,
        browserNotificationsEnabled: updated.browserNotificationsEnabled,
        dashboardCardOrder: updated.dashboardCardOrder,
      },
    });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return errorResponse("Failed to update profile.", 500);
  }
}

