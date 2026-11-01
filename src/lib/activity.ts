import { prisma } from "./db";

export async function logWorkspaceActivity(
  workspaceId: string,
  userId: string,
  action: string,
  details?: string
) {
  try {
    return await prisma.workspaceActivity.create({
      data: {
        workspaceId,
        userId,
        action,
        details,
      },
    });
  } catch (error) {
    console.error("Failed to log workspace activity:", error);
  }
}

export async function logTaskActivity(
  taskId: string,
  userId: string,
  action: string,
  details?: string
) {
  try {
    return await prisma.taskActivity.create({
      data: {
        taskId,
        userId,
        action,
        details,
      },
    });
  } catch (error) {
    console.error("Failed to log task activity:", error);
  }
}

export async function logJobApplicationActivity(
  jobApplicationId: string,
  action: string,
  details?: string
) {
  try {
    return await prisma.jobApplicationActivity.create({
      data: {
        jobApplicationId,
        action,
        details,
      },
    });
  } catch (error) {
    console.error("Failed to log job application activity:", error);
  }
}

export async function createNotification({
  userId,
  title,
  message,
  type = "INFO",
  linkUrl,
}: {
  userId: string;
  title: string;
  message: string;
  type?: "INFO" | "WARNING" | "SUCCESS" | "ASSIGNMENT" | "MENTION" | "REMINDER";
  linkUrl?: string;
}) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        linkUrl,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

