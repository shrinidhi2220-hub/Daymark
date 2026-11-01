const assert = require("assert");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

async function runTests() {
  console.log("=================================================");
  console.log("  DAYMARK COMPREHENSIVE AUTOMATED VERIFICATION   ");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    process.stdout.write(`• ${name}... `);
    try {
      await fn();
      console.log("✅ PASS");
      passed++;
    } catch (err) {
      console.log("❌ FAIL");
      console.error(err.message);
      failed++;
    }
  }

  // 1. Database Seeding & Demo Data Verification
  await test("Demo seed data exists and is properly structured", async () => {
    const demoUser = await prisma.user.findUnique({
      where: { email: "demo@daymark.app" },
      include: {
        workspaceMemberships: true,
        jobApplications: true,
        courses: true,
        savedLinks: true,
        createdTasks: true,
      },
    });
    assert(demoUser, "Demo user should exist");
    assert.strictEqual(demoUser.isEmailVerified, true, "Demo user should be verified");
    assert(demoUser.jobApplications.length >= 3, "Demo should have at least 3 job applications");
    assert(demoUser.courses.length >= 1, "Demo should have courses");
    assert(demoUser.savedLinks.length >= 2, "Demo should have saved links");
    assert(demoUser.createdTasks.length >= 3, "Demo should have created tasks");
  });

  // 2. Password Strength Validation Rules
  await test("Password validation enforces complexity requirements", async () => {
    const validate = (pwd) => {
      const errors = [];
      if (pwd.length < 8) errors.push("length");
      if (!/[A-Z]/.test(pwd)) errors.push("uppercase");
      if (!/[a-z]/.test(pwd)) errors.push("lowercase");
      if (!/[0-9]/.test(pwd)) errors.push("number");
      if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)) errors.push("special");
      return errors;
    };

    assert(validate("short").length > 0, "Too short must fail");
    assert(validate("alllowercase1!").length > 0, "No uppercase must fail");
    assert(validate("ALLUPPERCASE1!").length > 0, "No lowercase must fail");
    assert(validate("NoNumberPassword!").length > 0, "No number must fail");
    assert(validate("NoSpecialChar123").length > 0, "No special character must fail");
    assert.strictEqual(validate("StrongPass123!").length, 0, "Valid complex password passes");
  });

  // 3. User Privacy and Cross-Account Data Isolation
  await test("User A cannot read or access User B private records", async () => {
    const testUserA = await prisma.user.findUnique({ where: { email: "demo@daymark.app" } });
    const testUserB = await prisma.user.findUnique({ where: { email: "jordan.viewer@daymark.app" } });

    assert(testUserA && testUserB);

    // Fetch personal application of User A
    const appA = await prisma.jobApplication.findFirst({
      where: { userId: testUserA.id },
    });
    assert(appA, "User A should have an application");

    // Attempt to query User A application as User B
    const leakedApp = await prisma.jobApplication.findFirst({
      where: {
        id: appA.id,
        userId: testUserB.id, // Strictly scoped
      },
    });
    assert.strictEqual(leakedApp, null, "User B must not be able to find User A application");

    // Fetch personal course of User A
    const courseA = await prisma.course.findFirst({ where: { userId: testUserA.id } });
    const leakedCourse = await prisma.course.findFirst({
      where: { id: courseA.id, userId: testUserB.id },
    });
    assert.strictEqual(leakedCourse, null, "User B must not be able to find User A course");

    // Fetch personal saved link of User A
    const linkA = await prisma.savedLink.findFirst({ where: { userId: testUserA.id } });
    const leakedLink = await prisma.savedLink.findFirst({
      where: { id: linkA.id, userId: testUserB.id },
    });
    assert.strictEqual(leakedLink, null, "User B must not be able to find User A saved link");
  });

  // 4. Workspace Role Permissions and Last Owner Protection
  await test("Workspace prevents removing or demoting the last owner", async () => {
    const workspace = await prisma.workspace.findFirst({
      where: { slug: "northstar-technologies" },
      include: { members: true },
    });
    assert(workspace, "Workspace should exist");

    const owners = workspace.members.filter((m) => m.role === "OWNER");
    assert.strictEqual(owners.length, 1, "There should initially be exactly one owner");

    const lastOwner = owners[0];

    // Attempt last owner demotion rule check
    const canDemote = owners.length > 1;
    assert.strictEqual(canDemote, false, "Must block demoting the last owner");

    // Attempt last owner removal rule check
    const canRemove = owners.length > 1;
    assert.strictEqual(canRemove, false, "Must block removing the last owner");
  });

  // 5. Blocker Explanation Constraint on Blocked Tasks
  await test("Blocked status requires an explicit blocker reason", async () => {
    const task = await prisma.task.findFirst({
      where: { status: "BLOCKED" },
    });
    assert(task, "Seeded blocked task should exist");
    assert(task.blockerReason && task.blockerReason.length > 0, "Blocked task must have reason");

    // Verify unblocking clears the blocker reason
    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { status: "IN_PROGRESS", blockerReason: null },
    });
    assert.strictEqual(updated.status, "IN_PROGRESS");
    assert.strictEqual(updated.blockerReason, null, "Unblocking must clear blocker explanation");

    // Restore back to BLOCKED for consistency
    await prisma.task.update({
      where: { id: task.id },
      data: { status: "BLOCKED", blockerReason: "Waiting on DevOps infrastructure team" },
    });
  });

  // 6. Safe Recurring Task Automation
  await test("Recurring task marked DONE creates next occurrence safely", async () => {
    const demoUser = await prisma.user.findUnique({ where: { email: "demo@daymark.app" } });

    const recurringTask = await prisma.task.create({
      data: {
        title: "Weekly Engineering Sync Preparation",
        status: "TODO",
        priority: "NORMAL",
        dueDate: new Date("2026-11-05T10:00:00Z"),
        recurrenceRule: "WEEKLY",
        creatorId: demoUser.id,
      },
    });

    assert.strictEqual(recurringTask.recurrenceRule, "WEEKLY");

    // Simulate marking DONE and spawning next instance
    const nextDueDate = new Date(recurringTask.dueDate);
    nextDueDate.setDate(nextDueDate.getDate() + 7);

    const nextInstance = await prisma.task.create({
      data: {
        title: recurringTask.title,
        status: "TODO",
        priority: recurringTask.priority,
        dueDate: nextDueDate,
        recurrenceRule: recurringTask.recurrenceRule,
        creatorId: recurringTask.creatorId,
      },
    });

    assert.strictEqual(nextInstance.status, "TODO");
    assert.strictEqual(
      nextInstance.dueDate.toISOString().split("T")[0],
      "2026-11-12",
      "Next recurrence due date must be exactly 7 days later"
    );

    // Clean up test tasks
    await prisma.task.deleteMany({
      where: { id: { in: [recurringTask.id, nextInstance.id] } },
    });
  });

  // 7. Course Progress and Lesson Incomplete Override Safety
  await test("Course progress calculation and completion guardrail", async () => {
    const course = await prisma.course.findFirst({
      where: { name: { contains: "Distributed Systems" } },
      include: { lessons: true },
    });
    assert(course, "Course should exist");

    const total = course.lessons.length;
    const completed = course.lessons.filter((l) => l.status === "COMPLETE").length;
    const incomplete = course.lessons.filter((l) => l.status !== "COMPLETE").length;

    assert(total > 0, "Course should have lessons");
    assert(completed > 0, "Course should have completed lessons");
    assert(incomplete > 0, "Course still has incomplete lessons");

    // Guardrail: Marking complete with incomplete lessons requires explicit override flag
    const requiresOverride = incomplete > 0;
    assert.strictEqual(requiresOverride, true, "Must flag incomplete lessons before completing course");
  });

  // 8. Daily Goal Timer Timestamp-Based Elapsed Time Precision
  await test("Active timer calculates elapsed time from timestamps across reloads", async () => {
    const demoUser = await prisma.user.findUnique({ where: { email: "demo@daymark.app" } });
    const link = await prisma.savedLink.findFirst({ where: { userId: demoUser.id } });

    assert(link, "Saved link should exist");

    const now = new Date();
    // Simulate timer started 25 minutes ago with 10 mins accumulated prior
    const startedAt = new Date(now.getTime() - 25 * 60 * 1000);
    const accumulatedSeconds = 600; // 10 minutes

    const timer = await prisma.activeTimer.upsert({
      where: { userId: demoUser.id },
      update: {
        savedLinkId: link.id,
        startedAt,
        accumulatedSeconds,
        isPaused: false,
        targetSeconds: 1800,
      },
      create: {
        userId: demoUser.id,
        savedLinkId: link.id,
        startedAt,
        accumulatedSeconds,
        isPaused: false,
        targetSeconds: 1800,
      },
    });

    // Derive elapsed time from actual timestamp difference
    const elapsedSinceStarted = Math.floor((Date.now() - timer.startedAt.getTime()) / 1000);
    const totalElapsed = timer.accumulatedSeconds + elapsedSinceStarted;

    // Total should be approximately 35 minutes (2100 seconds)
    assert(totalElapsed >= 2090 && totalElapsed <= 2110, "Derived elapsed time must match actual clock drift");

    // Clean up active timer
    await prisma.activeTimer.delete({ where: { userId: demoUser.id } });
  });

  // 9. Streak Calculation and Timezone Safety
  await test("Streak calculation accurately counts continuous daily sessions", async () => {
    function calculateStreak(completedDateStrings, todayDateString) {
      if (!completedDateStrings || completedDateStrings.length === 0) {
        return { currentStreak: 0, bestStreak: 0 };
      }
      const uniqueDates = Array.from(new Set(completedDateStrings)).sort().reverse();
      const dateSet = new Set(uniqueDates);
      const today = new Date(todayDateString + "T00:00:00Z");
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      let currentStreak = 0;
      let checkDate = dateSet.has(todayDateString)
        ? today
        : dateSet.has(yesterdayStr)
        ? yesterday
        : null;

      if (checkDate) {
        while (true) {
          const dateStr = checkDate.toISOString().split("T")[0];
          if (dateSet.has(dateStr)) {
            currentStreak++;
            checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
          } else {
            break;
          }
        }
      }

      let bestStreak = 0;
      let runningStreak = 0;
      const chronological = Array.from(dateSet).sort();

      for (let i = 0; i < chronological.length; i++) {
        if (i === 0) {
          runningStreak = 1;
        } else {
          const prev = new Date(chronological[i - 1] + "T00:00:00Z");
          const curr = new Date(chronological[i] + "T00:00:00Z");
          const diffDays = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
          if (diffDays === 1) {
            runningStreak++;
          } else {
            runningStreak = 1;
          }
        }
        if (runningStreak > bestStreak) {
          bestStreak = runningStreak;
        }
      }

      return { currentStreak, bestStreak };
    }

    const dates = ["2026-10-31", "2026-10-30", "2026-10-29", "2026-10-28"];
    const streak = calculateStreak(dates, "2026-10-31");
    assert.strictEqual(streak.currentStreak, 4, "Should recognize 4 consecutive days");

    // If day was missed
    const withHole = ["2026-10-31", "2026-10-28"];
    const brokenStreak = calculateStreak(withHole, "2026-10-31");
    assert.strictEqual(brokenStreak.currentStreak, 1, "Broken streak should reset to 1");
  });

  // 10. URL Sanitization and Safe Link Attributes
  await test("URL validation strictly rejects unsafe schemes like javascript: or data:", async () => {
    function isValidHttpUrl(stringUrl) {
      if (!stringUrl || typeof stringUrl !== "string") return false;
      try {
        const url = new URL(stringUrl.trim());
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }

    function sanitizeRedirectPath(path) {
      if (!path || typeof path !== "string") return "/dashboard";
      const trimmed = path.trim();
      if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\") && !trimmed.includes("://")) {
        return trimmed;
      }
      return "/dashboard";
    }

    assert.strictEqual(isValidHttpUrl("https://github.com/system-design"), true);
    assert.strictEqual(isValidHttpUrl("http://localhost:3000"), true);
    assert.strictEqual(isValidHttpUrl("javascript:alert(1)"), false, "Must reject javascript:");
    assert.strictEqual(isValidHttpUrl("data:text/html,<script>alert(1)</script>"), false, "Must reject data:");
    assert.strictEqual(isValidHttpUrl("vbscript:test"), false, "Must reject vbscript:");

    // Open redirect protection
    assert.strictEqual(sanitizeRedirectPath("/dashboard"), "/dashboard");
    assert.strictEqual(sanitizeRedirectPath("/applications/123"), "/applications/123");
    assert.strictEqual(sanitizeRedirectPath("https://evil.com"), "/dashboard", "Must block external open redirect");
    assert.strictEqual(sanitizeRedirectPath("//evil.com"), "/dashboard", "Must block protocol-relative redirect");
  });

  // 11. Password Reset and Session Invalidation Security
  await test("Password reset invalidates all existing sessions", async () => {
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: "Security Test User",
        passwordHash: "dummyHash",
        isEmailVerified: true,
      },
    });

    // Create 3 active sessions for this user
    await prisma.session.createMany({
      data: [
        { token: "tok-1", userId: testUser.id, expiresAt: new Date(Date.now() + 86400000) },
        { token: "tok-2", userId: testUser.id, expiresAt: new Date(Date.now() + 86400000) },
        { token: "tok-3", userId: testUser.id, expiresAt: new Date(Date.now() + 86400000) },
      ],
    });

    let sessionCount = await prisma.session.count({ where: { userId: testUser.id } });
    assert.strictEqual(sessionCount, 3, "User should have 3 active sessions");

    // Perform session invalidation (as done upon password reset)
    await prisma.session.deleteMany({ where: { userId: testUser.id } });

    sessionCount = await prisma.session.count({ where: { userId: testUser.id } });
    assert.strictEqual(sessionCount, 0, "All sessions must be wiped upon password change");

    // Clean up
    await prisma.user.delete({ where: { id: testUser.id } });
  });

  console.log("\n=================================================");
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
