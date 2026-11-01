const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Daymark database seeding...");

  // Clean existing data for clean demo state
  await prisma.notification.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.activeTimer.deleteMany();
  await prisma.dailyGoalSession.deleteMany();
  await prisma.savedLink.deleteMany();
  await prisma.studySession.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.courseSection.deleteMany();
  await prisma.course.deleteMany();
  await prisma.jobApplicationActivity.deleteMany();
  await prisma.interviewRound.deleteMany();
  await prisma.jobApplication.deleteMany();
  await prisma.taskAttachment.deleteMany();
  await prisma.taskActivity.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.workspaceActivity.deleteMany();
  await prisma.workspaceInvitation.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash("Daymark2026!", salt);

  // 1. Create Primary Demo User
  const demoUser = await prisma.user.create({
    data: {
      email: "demo@daymark.app",
      name: "Morgan Taylor",
      passwordHash,
      timezone: "America/New_York",
      isEmailVerified: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      browserNotificationsEnabled: true,
      dashboardCardOrder: "tasks,applications,interviews,courses,goals,activity",
    },
  });

  // 2. Create Colleague Users for Team Workspaces
  const teammateAlex = await prisma.user.create({
    data: {
      email: "alex.teammate@daymark.app",
      name: "Alex Rivera",
      passwordHash,
      timezone: "America/New_York",
      isEmailVerified: true,
    },
  });

  const teammateJordan = await prisma.user.create({
    data: {
      email: "jordan.viewer@daymark.app",
      name: "Jordan Lee",
      passwordHash,
      timezone: "America/Los_Angeles",
      isEmailVerified: true,
    },
  });

  console.log("✓ Created demo users");

  // 3. Create Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: "Northstar Technologies",
      slug: "northstar-technologies",
      description: "Team collaboration workspace for core engineering & product development.",
      ownerId: demoUser.id,
    },
  });

  // Add members
  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: workspace.id, userId: demoUser.id, role: "OWNER" },
      { workspaceId: workspace.id, userId: teammateAlex.id, role: "ADMIN" },
      { workspaceId: workspace.id, userId: teammateJordan.id, role: "VIEWER" },
    ],
  });

  // Add projects
  const projectWeb = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Web Platform Redesign",
      description: "Migration to Next.js App Router and design system standardization.",
      color: "#0c87eb",
    },
  });

  const projectApi = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Public API Gateway",
      description: "Rate limiting, OpenAPI 3.1 documentation, and OAuth token management.",
      color: "#10b981",
    },
  });

  // 4. Create Job Applications
  const appStripe = await prisma.jobApplication.create({
    data: {
      userId: demoUser.id,
      companyName: "Stripe",
      roleTitle: "Staff Systems Engineer",
      jobUrl: "https://stripe.com/jobs/staff-engineer",
      jobDescription: "Architect resilient money movement pipelines handling millions of events per second with strict zero-loss consistency guarantees.",
      location: "San Francisco, CA / Remote",
      workArrangement: "REMOTE",
      employmentType: "FULL_TIME",
      salaryRange: "$230,000 - $275,000",
      currency: "USD",
      dateFound: new Date(Date.now() - 14 * 86400000),
      applicationDate: new Date(Date.now() - 10 * 86400000),
      contactName: "Sarah Chen",
      contactDetails: "schen@stripe.com / Technical Recruiter",
      notes: "Referral from teammate. Spoke about distributed ledger replication and idempotent API design.",
      nextFollowUpDate: new Date(Date.now() + 2 * 86400000),
      stage: "INTERVIEWING",
      resumeUrl: "https://files.daymark.internal/resumes/morgan-taylor-staff-2026.pdf",
      resumeVersion: "v3.1-DistributedSystems",
      coverLetterUrl: "https://files.daymark.internal/cover-letters/stripe-cover.pdf",
      coverLetterVersion: "v1.0",
    },
  });

  // Interview rounds for Stripe
  await prisma.interviewRound.create({
    data: {
      jobApplicationId: appStripe.id,
      roundTitle: "Recruiter Phone Screen",
      interviewDate: new Date(Date.now() - 5 * 86400000),
      timezone: "America/New_York",
      format: "Phone Call",
      interviewer: "Sarah Chen",
      preparationNotes: "Review background on high-throughput queue systems and team leadership.",
      outcome: "PASSED",
    },
  });

  const stripeUpcomingRound = await prisma.interviewRound.create({
    data: {
      jobApplicationId: appStripe.id,
      roundTitle: "System Design: Scalable Event Log Architecture",
      interviewDate: new Date(Date.now() + 3 * 86400000),
      timezone: "America/New_York",
      format: "Video (Google Meet)",
      interviewer: "David Evans (Staff Architect)",
      preparationNotes: "Prepare deep dive into Raft consensus, WAL compaction, and partition recovery.",
      outcome: "SCHEDULED",
    },
  });

  const appLinear = await prisma.jobApplication.create({
    data: {
      userId: demoUser.id,
      companyName: "Linear",
      roleTitle: "Product Engineer",
      jobUrl: "https://linear.app/careers/product-engineer",
      jobDescription: "Craft delightful, lightning-fast productivity workflows with local-first sync and keyboard-first navigation.",
      location: "San Francisco, CA / Remote",
      workArrangement: "REMOTE",
      employmentType: "FULL_TIME",
      salaryRange: "$180,000 - $210,000",
      currency: "USD",
      dateFound: new Date(Date.now() - 20 * 86400000),
      applicationDate: new Date(Date.now() - 15 * 86400000),
      contactName: "Marcus Lindqvist",
      contactDetails: "careers@linear.app",
      notes: "Submitted custom demo showing optimistic UI sync.",
      nextFollowUpDate: new Date(Date.now() - 1 * 86400000), // Overdue follow-up
      stage: "APPLIED",
    },
  });

  const appVercel = await prisma.jobApplication.create({
    data: {
      userId: demoUser.id,
      companyName: "Vercel",
      roleTitle: "Developer Experience Engineer",
      jobUrl: "https://vercel.com/careers",
      jobDescription: "Help developers build blazing fast web applications on Next.js and Vercel Edge Runtime.",
      location: "Remote",
      workArrangement: "REMOTE",
      employmentType: "FULL_TIME",
      salaryRange: "$190,000 - $220,000",
      currency: "USD",
      dateFound: new Date(Date.now() - 30 * 86400000),
      applicationDate: new Date(Date.now() - 25 * 86400000),
      contactName: "Elena Rostova",
      notes: "Received written offer letter! Need to review equity schedule and 401(k) match before end of week.",
      nextFollowUpDate: new Date(Date.now() + 4 * 86400000),
      stage: "OFFER",
    },
  });

  console.log("✓ Created job applications and interview rounds");

  // 5. Create Courses & Lessons
  const courseDistributed = await prisma.course.create({
    data: {
      userId: demoUser.id,
      name: "MIT 6.824: Distributed Systems Engineering",
      provider: "MIT OpenCourseWare",
      subjectCategory: "Computer Science",
      courseUrl: "https://pdos.csail.mit.edu/6.824/",
      description: "In-depth study of fault tolerance, replication, Paxos/Raft consensus, and Byzantine agreement.",
      targetCompletionDate: new Date(Date.now() + 30 * 86400000),
      status: "IN_PROGRESS",
      notes: "Focusing on Raft leader election invariants and log matching safety.",
      questions: "How does 2-phase commit behave under network partitions vs Raft?",
      keyTakeaways: "Split-brain prevention requires strict majority quorums (> N/2).",
    },
  });

  const sec1 = await prisma.courseSection.create({
    data: {
      courseId: courseDistributed.id,
      title: "Module 1: RPC, Concurrency & State Machines",
      orderIndex: 0,
    },
  });

  const sec2 = await prisma.courseSection.create({
    data: {
      courseId: courseDistributed.id,
      title: "Module 2: Consensus Algorithms (Raft)",
      orderIndex: 1,
    },
  });

  await prisma.lesson.createMany({
    data: [
      {
        courseId: courseDistributed.id,
        sectionId: sec1.id,
        title: "Lecture 1: Introduction to Distributed Systems & MapReduce",
        status: "COMPLETE",
        orderIndex: 0,
        completedAt: new Date(Date.now() - 7 * 86400000),
      },
      {
        courseId: courseDistributed.id,
        sectionId: sec1.id,
        title: "Lecture 2: RPC and Threads in Go",
        status: "COMPLETE",
        orderIndex: 1,
        completedAt: new Date(Date.now() - 4 * 86400000),
      },
      {
        courseId: courseDistributed.id,
        sectionId: sec2.id,
        title: "Lecture 3: GFS Architecture and Weak Consistency",
        status: "IN_PROGRESS",
        orderIndex: 2,
      },
      {
        courseId: courseDistributed.id,
        sectionId: sec2.id,
        title: "Lecture 4: Raft Leader Election & Heartbeats",
        status: "NOT_STARTED",
        orderIndex: 3,
      },
      {
        courseId: courseDistributed.id,
        sectionId: sec2.id,
        title: "Lecture 5: Raft Log Compaction & Snapshots",
        status: "NOT_STARTED",
        orderIndex: 4,
      },
    ],
  });

  // Study sessions
  await prisma.studySession.create({
    data: {
      courseId: courseDistributed.id,
      userId: demoUser.id,
      startedAt: new Date(Date.now() - 2 * 86400000),
      endedAt: new Date(Date.now() - 2 * 86400000 + 45 * 60000),
      durationMinutes: 45,
      notes: "Implemented RPC retry client with exponential backoff and jitter.",
    },
  });

  console.log("✓ Created courses and lessons");

  // 6. Create Saved Links & Daily Goals
  const link1 = await prisma.savedLink.create({
    data: {
      userId: demoUser.id,
      title: "System Design Primer - Comprehensive Guide",
      url: "https://github.com/donnemartin/system-design-primer",
      description: "An organized collection of system design topics, trade-offs, and real-world architectures.",
      category: "Documentation",
      dailyGoalDurationMinutes: 30,
      isPinned: true,
      sortOrder: 0,
    },
  });

  const link2 = await prisma.savedLink.create({
    data: {
      userId: demoUser.id,
      title: "NeetCode 150 - Core Algorithm Patterns",
      url: "https://neetcode.io/practice",
      description: "Curated problem lists covering two pointers, sliding window, graphs, and dynamic programming.",
      category: "LeetCode",
      dailyGoalDurationMinutes: 45,
      isPinned: true,
      sortOrder: 1,
    },
  });

  const link3 = await prisma.savedLink.create({
    data: {
      userId: demoUser.id,
      title: "React 19 Deep Dive & Server Actions Best Practices",
      url: "https://react.dev/blog/2024/04/25/react-19",
      description: "Official guide on useActionState, useOptimistic, and Server Components.",
      category: "Documentation",
      dailyGoalDurationMinutes: 20,
      isPinned: false,
      sortOrder: 2,
    },
  });

  // Seed daily goal sessions for streaks
  const todayStr = new Date().toISOString().split("T")[0];
  const d1 = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const d2 = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];
  const d3 = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];

  await prisma.dailyGoalSession.createMany({
    data: [
      {
        savedLinkId: link1.id,
        userId: demoUser.id,
        startedAt: new Date(Date.now() - 3 * 86400000),
        endedAt: new Date(Date.now() - 3 * 86400000 + 1800000),
        durationSeconds: 1800,
        isCompleted: true,
        sessionDate: d3,
      },
      {
        savedLinkId: link1.id,
        userId: demoUser.id,
        startedAt: new Date(Date.now() - 2 * 86400000),
        endedAt: new Date(Date.now() - 2 * 86400000 + 1800000),
        durationSeconds: 1800,
        isCompleted: true,
        sessionDate: d2,
      },
      {
        savedLinkId: link1.id,
        userId: demoUser.id,
        startedAt: new Date(Date.now() - 86400000),
        endedAt: new Date(Date.now() - 86400000 + 2000000),
        durationSeconds: 2000,
        isCompleted: true,
        sessionDate: d1,
      },
      {
        savedLinkId: link2.id,
        userId: demoUser.id,
        startedAt: new Date(Date.now() - 86400000),
        endedAt: new Date(Date.now() - 86400000 + 2700000),
        durationSeconds: 2700,
        isCompleted: true,
        sessionDate: d1,
      },
    ],
  });

  console.log("✓ Created saved links and daily goal history");

  // 7. Create Tasks (Personal + Workspace + Cross-Module linked)
  const task1 = await prisma.task.create({
    data: {
      title: "Prepare Raft Consensus Deep Dive for Stripe Interview",
      description: "Review log compaction edge cases, follower replication lags, and split-brain guarantees before the architectural round.",
      status: "IN_PROGRESS",
      priority: "URGENT",
      dueDate: new Date(Date.now() + 2 * 86400000),
      tags: "interview,stripe,distributed-systems",
      creatorId: demoUser.id,
      assigneeId: demoUser.id,
      linkedJobApplicationId: appStripe.id,
      linkedCourseId: courseDistributed.id,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: "Implement API Rate Limiting Middleware with Redis Token Bucket",
      description: "Protect public endpoints against burst traffic. Must support per-tenant tier limits and return standard RFC 6585 headers (Retry-After, X-RateLimit-Remaining).",
      status: "BLOCKED",
      priority: "HIGH",
      blockerReason: "Waiting on DevOps infrastructure team to provision production Redis cluster with TLS enabled.",
      dueDate: new Date(Date.now() + 1 * 86400000),
      tags: "api,security,infra",
      workspaceId: workspace.id,
      projectId: projectApi.id,
      creatorId: demoUser.id,
      assigneeId: teammateAlex.id,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      title: "Update Design System Tokens and Dark Mode Contrast",
      description: "Audit WCAG 2.1 AA color contrast compliance for text and interactive controls across both themes.",
      status: "TODO",
      priority: "NORMAL",
      dueDate: new Date(Date.now() + 5 * 86400000),
      tags: "design-system,accessibility,frontend",
      workspaceId: workspace.id,
      projectId: projectWeb.id,
      creatorId: teammateAlex.id,
      assigneeId: demoUser.id,
    },
  });

  const task4 = await prisma.task.create({
    data: {
      title: "Send follow-up email to Linear recruitment coordinator",
      description: "Inquire politely regarding application review status and reiterate enthusiasm for their local-first sync roadmap.",
      status: "TODO",
      priority: "HIGH",
      dueDate: new Date(Date.now() - 1 * 86400000), // Overdue
      tags: "job-search,follow-up",
      creatorId: demoUser.id,
      assigneeId: demoUser.id,
      linkedJobApplicationId: appLinear.id,
    },
  });

  const task5 = await prisma.task.create({
    data: {
      title: "Complete 2 Hard Dynamic Programming Problems on NeetCode",
      description: "Practice coin change variations and edit distance memoization patterns.",
      status: "DONE",
      priority: "NORMAL",
      dueDate: new Date(Date.now() - 86400000),
      tags: "dsa,leetcode,learning",
      creatorId: demoUser.id,
      assigneeId: demoUser.id,
      linkedSavedLinkId: link2.id,
    },
  });

  // Task subtasks/checklist for task1
  await prisma.task.createMany({
    data: [
      {
        title: "Diagram leader election state machine",
        status: "DONE",
        priority: "NORMAL",
        creatorId: demoUser.id,
        assigneeId: demoUser.id,
        parentTaskId: task1.id,
      },
      {
        title: "Review WAL snapshot truncation algorithm",
        status: "IN_PROGRESS",
        priority: "NORMAL",
        creatorId: demoUser.id,
        assigneeId: demoUser.id,
        parentTaskId: task1.id,
      },
      {
        title: "Mock system architecture for 10M writes/sec",
        status: "TODO",
        priority: "HIGH",
        creatorId: demoUser.id,
        assigneeId: demoUser.id,
        parentTaskId: task1.id,
      },
    ],
  });

  // Comments on task2
  await prisma.taskComment.create({
    data: {
      taskId: task2.id,
      authorId: teammateAlex.id,
      content: "I reached out to Cloud Ops. They confirmed the VPC peering setup will be ready by tomorrow morning @Morgan Taylor.",
      mentions: JSON.stringify([demoUser.id]),
    },
  });

  // 8. Reminders
  await prisma.reminder.createMany({
    data: [
      {
        userId: demoUser.id,
        title: "Stripe System Design Interview with David Evans",
        targetType: "INTERVIEW",
        targetId: stripeUpcomingRound.id,
        remindAt: new Date(Date.now() + 3 * 86400000 - 3600000), // 1 hr before
        frequency: "ONCE",
      },
      {
        userId: demoUser.id,
        title: "Follow up with Linear Careers coordinator",
        targetType: "FOLLOW_UP",
        targetId: appLinear.id,
        remindAt: new Date(Date.now() - 3600000), // Due today/overdue
        frequency: "ONCE",
      },
      {
        userId: demoUser.id,
        title: "Daily System Design Primer reading goal (30 mins)",
        targetType: "DAILY_GOAL",
        targetId: link1.id,
        remindAt: new Date(Date.now() + 7200000),
        frequency: "DAILY",
      },
    ],
  });

  // 9. Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: demoUser.id,
        title: "Mentioned in task 'Implement API Rate Limiting Middleware'",
        message: "Alex Rivera mentioned you in a comment on API Rate Limiting Middleware.",
        type: "MENTION",
        linkUrl: `/tasks?selected=${task2.id}`,
        isRead: false,
      },
      {
        userId: demoUser.id,
        title: "Interview scheduled: Stripe (System Design)",
        message: "Your interview with David Evans is scheduled for 3 days from now.",
        type: "REMINDER",
        linkUrl: `/applications/${appStripe.id}`,
        isRead: false,
      },
      {
        userId: demoUser.id,
        title: "Offer Received: Vercel",
        message: "Vercel has extended an offer for Developer Experience Engineer.",
        type: "SUCCESS",
        linkUrl: `/applications/${appVercel.id}`,
        isRead: true,
      },
    ],
  });

  // 10. Workspace Activity
  await prisma.workspaceActivity.createMany({
    data: [
      {
        workspaceId: workspace.id,
        userId: demoUser.id,
        action: "PROJECT_CREATED",
        details: "Created project 'Web Platform Redesign'",
      },
      {
        workspaceId: workspace.id,
        userId: teammateAlex.id,
        action: "TASK_STATUS_CHANGED",
        details: "Marked 'Implement API Rate Limiting Middleware' as Blocked (Waiting on Redis cluster)",
      },
    ],
  });

  console.log("✅ Daymark database seeded successfully with rich realistic demo data!");
  console.log("Demo credentials:");
  console.log("  Email: demo@daymark.app");
  console.log("  Password: Daymark2026!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

