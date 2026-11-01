export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return jsonResponse({ results: [] });
    }

    const userWorkspaceIds = user.workspaceMemberships.map((m) => m.workspaceId);

    // Run parallel queries strictly scoped to authorized user and workspace memberships
    const [applications, tasks, courses, savedLinks, projects] = await Promise.all([
      // Applications (User owned)
      prisma.jobApplication.findMany({
        where: {
          userId: user.id,
          OR: [
            { companyName: { contains: query } },
            { roleTitle: { contains: query } },
            { location: { contains: query } },
            { notes: { contains: query } },
          ],
        },
        take: 6,
        select: {
          id: true,
          companyName: true,
          roleTitle: true,
          stage: true,
          location: true,
        },
      }),

      // Tasks (User created, assigned, or within authorized workspaces)
      prisma.task.findMany({
        where: {
          OR: [
            { workspaceId: null, creatorId: user.id },
            { workspaceId: { in: userWorkspaceIds } },
          ],
          AND: [
            {
              OR: [
                { title: { contains: query } },
                { description: { contains: query } },
                { tags: { contains: query } },
              ],
            },
          ],
        },
        take: 8,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          workspace: { select: { name: true } },
        },
      }),

      // Courses (User owned)
      prisma.course.findMany({
        where: {
          userId: user.id,
          OR: [
            { name: { contains: query } },
            { provider: { contains: query } },
            { subjectCategory: { contains: query } },
            { notes: { contains: query } },
          ],
        },
        take: 6,
        select: {
          id: true,
          name: true,
          provider: true,
          status: true,
        },
      }),

      // Saved Links (User owned)
      prisma.savedLink.findMany({
        where: {
          userId: user.id,
          OR: [
            { title: { contains: query } },
            { url: { contains: query } },
            { description: { contains: query } },
            { category: { contains: query } },
          ],
        },
        take: 6,
        select: {
          id: true,
          title: true,
          url: true,
          category: true,
        },
      }),

      // Projects in authorized workspaces
      prisma.project.findMany({
        where: {
          workspaceId: { in: userWorkspaceIds },
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
          ],
        },
        take: 4,
        select: {
          id: true,
          name: true,
          workspace: { select: { name: true } },
        },
      }),
    ]);

    const results = [
      ...applications.map((app) => ({
        id: app.id,
        type: "application",
        title: `${app.companyName} — ${app.roleTitle}`,
        subtitle: `Stage: ${app.stage}${app.location ? ` • ${app.location}` : ""}`,
        url: `/applications/${app.id}`,
      })),
      ...tasks.map((task) => ({
        id: task.id,
        type: "task",
        title: task.title,
        subtitle: `${task.workspace ? `Workspace: ${task.workspace.name}` : "Personal"} • Status: ${task.status} • Priority: ${task.priority}`,
        url: `/tasks?selected=${task.id}`,
      })),
      ...courses.map((course) => ({
        id: course.id,
        type: "course",
        title: course.name,
        subtitle: `${course.provider ? `${course.provider} • ` : ""}Status: ${course.status}`,
        url: `/courses/${course.id}`,
      })),
      ...savedLinks.map((link) => ({
        id: link.id,
        type: "saved-link",
        title: link.title,
        subtitle: `Category: ${link.category} • ${link.url}`,
        url: `/saved-links?selected=${link.id}`,
      })),
      ...projects.map((proj) => ({
        id: proj.id,
        type: "project",
        title: proj.name,
        subtitle: `Project in ${proj.workspace.name}`,
        url: `/tasks?projectId=${proj.id}`,
      })),
    ];

    return jsonResponse({ results });
  } catch (error: any) {
    console.error("Search error:", error);
    return errorResponse("Search failed.", 500);
  }
}

