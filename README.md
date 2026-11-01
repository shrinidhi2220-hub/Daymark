# Daymark

> A personal and team workspace for managing job applications, team tasks, courses, saved websites, and daily learning routines.

Daymark is a complete, production-minded web application designed for focused software professionals and high-performing engineering teams. It bridges the gap between individual career and skill growth and shared team project execution, ensuring personal data stays strictly private by default while providing role-based collaboration in team workspaces.

---

## Key Features & Modules

### 1. Daily Overview Dashboard
- **Tasks Due Today & Overdue**: Separated by personal vs shared context with direct check-to-complete controls.
- **Upcoming Interviews & Follow-Up Deadlines**: Countdowns, interviewer information, and one-click preparation links.
- **Daily Learning & Saved Goals**: Today's active focus time, target minutes, and direct timer activation.
- **Course Progress & Next Lessons**: Real-time curriculum percentage bars and prominent resume links.
- **Upcoming 7-Day / 30-Day View**: Toggle view for scheduling horizon.
- **Configurable & Persistent**: Show, hide, and reorder dashboard cards; preferences are saved directly to user settings.
- **Context Switching**: Filter entire dashboard between All, Personal (Private), or specific Workspaces.

### 2. Job Applications Pipeline
- **Multiple Views**: Board (Kanban), List, and Calendar/Deadlines views.
- **Accessible Stage Control**: Change stage using direct accessible dropdowns without requiring drag-and-drop (`Saved`, `Preparing`, `Applied`, `Interviewing`, `Offer`, `Rejected`, `Withdrawn`).
- **Comprehensive Fields**: Company name, role/title, job URL, description, location, work arrangement (Remote/Hybrid/On-site), salary range and currency, contact details, notes, resume & cover letter links with version labels.
- **Interview Rounds Tracker**: Schedule multiple rounds with date/time, timezone, format (Video/Phone/In-person), interviewer, prep notes, and outcome (`Scheduled`, `Passed`, `Failed`, `Pending`).
- **Follow-up Reminders**: Automatically schedule and trigger reminders for interview dates and recruiter follow-ups.
- **Cross-Module Linked Tasks**: Create interview prep or follow-up tasks linked directly to an application.
- **Archive & Restore**: Isolate archived applications without losing historical data.

### 3. Team & Personal Tasks
- **Context Scoping**: Strict boundary between private personal tasks (`workspaceId: null`) and shared workspace tasks.
- **Kanban Board & List Views**: Columns for `To Do`, `In Progress`, `Blocked`, and `Done`.
- **Enforced Blocker Reasons**: Marking a task as `Blocked` requires an explanation for visibility; unblocking clears it consistently.
- **Checklist Subtasks**: Multi-step subtasks with interactive checkboxes and progress counters.
- **Discussion & Mentions**: Comments thread with author, timestamps, and `@mentions` that resolve strictly to workspace members.
- **Recurrence Engine**: Support for `Daily`, `Weekly`, and `Monthly` rules that safely generate the next occurrence upon task completion.
- **Cross-Module Connections**: Link tasks directly to Job Applications, Courses, or Saved Link goals.

### 4. Courses & Learning
- **Syllabus Hierarchy**: Organize courses into sections and ordered lessons.
- **Lesson Checkpoints**: Track completion status (`Not Started`, `In Progress`, `Complete`) with completion timestamps.
- **Guardrail Override Protection**: Prevents marking a course complete when unfinished lessons remain unless the user explicitly confirms the override.
- **Study Sessions Logger**: Record study sessions with duration in minutes and key takeaways (validates against negative or impossible values).
- **Knowledge Retention Cards**: Dedicated spaces for notes, open questions, and core takeaways.

### 5. Saved Links & Daily Goals with Timestamp-Accurate Timer
- **Curated Categorization**: `YouTube`, `LeetCode`, `Courses`, `Job Search`, `Documentation`, and `Custom`.
- **Safe External Links**: Strict URL validation (rejects `javascript:`, `data:`, etc.), displays destination domain before opening, and opens safely in new tab (`rel="noopener noreferrer"`).
- **Copy Link**: One-click clipboard copy.
- **Persistent Timer Engine**: Derives elapsed seconds from wall-clock timestamps rather than UI ticks, preserving accurate time across browser refreshes and tab backgrounding.
- **Global Timer Visibility**: Active timer is visible in the top navigation bar from any page in the app, with play, pause, finish, and discard actions.
- **Streaks & Daily History**: Daily completion tracking with timezone-aware streak calculations (`currentStreak` and `bestStreak`).
- **Manual Completion**: Support for marking goals complete without running a live timer.

### 6. Workspaces, Roles & Invitations
- **Role Hierarchy**:
  - `OWNER`: Full workspace control, billing/settings, member management, and workspace deletion.
  - `ADMIN`: Manage members, projects, and shared work; cannot remove or demote the owner.
  - `MEMBER`: Create, edit, and assign shared tasks and projects.
  - `VIEWER`: Read-only access to shared tasks and projects.
- **Last Owner Protection**: Prevents removing or demoting the last remaining owner of a workspace.
- **Expiring Invitations**: Owners and admins can invite members by email with a 7-day single-use token. Revocation supported.
- **Email Match Validation**: Invitation acceptance ensures the signed-in account matches the invited email address.
- **Workspace Activity Log**: Audit trail of member role changes, task creation, and project milestones.

### 7. Reminders, Notifications & Search
- **In-App Notification Center**: Unread count badges, mark as read, mark all read, and deep-links to relevant records.
- **User-Controlled Reminders**: Actionable reminders with `Snooze (1 hour)`, `Dismiss`, and `Mark Complete`.
- **Quiet Hours**: Configurable quiet hours window (e.g. 22:00 - 08:00) stored in user preferences.
- **Browser Notifications**: Opt-in desktop notifications with clear disclosures of offline/closed-tab limitations.
- **Global Search (`Cmd+K` / `Ctrl+K`)**: Rapid search scoped strictly to authorized personal and workspace records.

### 8. Security & Account Management
- **Authentication**: Email and password with bcrypt (cost factor 12) hashing.
- **Server-Side Sessions**: 32-byte cryptographically secure random session tokens stored in SQLite with `httpOnly`, `SameSite: Lax`, and expiration tracking.
- **Single-Use Verification & Reset Tokens**: Time-limited tokens for email verification and password reset.
- **Session Revocation**: Changing or resetting password immediately revokes all other active sessions across devices.
- **Data Export**: Complete machine-readable JSON archive export of all personal user data.
- **Account Deletion**: Multi-step confirmation requiring password verification and typing "DELETE". Protects sole owners of shared workspaces from leaving orphaned workspaces.
- **Open Redirect Protection**: Strict validation of redirect return paths to internal URLs only.

---

## Architecture & Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | Unified server/client architecture, server-side data fetching, and secure API routes. |
| **Language** | TypeScript | Complete static type safety across database models, API payloads, and UI props. |
| **Database** | SQLite with Prisma ORM | Embedded relational database with zero external setup, foreign keys, cascade deletes, and migrations. |
| **Styling** | Tailwind CSS | Utility-first styling with consistent typography, custom brand color tokens, and complete light/dark theme. |
| **Icons** | Lucide React | Consistent, accessible iconography. |
| **Security** | bcryptjs & Node Crypto | Industry-standard password hashing and cryptographically secure random token generation. |

---

## Getting Started

### Prerequisites
- **Node.js**: v18.17.0+ or v20+ (tested on Node v24.16.0)
- **npm**: v9+ (or package manager of choice)

### 1. Clone & Install Dependencies
```bash
cd Daymark
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` configuration:
```env
DATABASE_URL="file:./dev.db"
APP_URL="http://localhost:3000"
SESSION_SECRET="change-this-to-a-secure-random-32-byte-hex-string"
NODE_ENV="development"
```

### 3. Initialize & Seed Database
Sync the SQLite schema and seed the rich demo dataset:
```bash
# Push Prisma schema to SQLite
npx prisma db push

# Seed realistic demo data
npm run db:seed
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Demo Credentials

The database comes pre-seeded with realistic fictional data for immediate exploration:

| Account | Email | Password | Role / Context |
|---|---|---|---|
| **Primary Demo** | `demo@daymark.app` | `Daymark2026!` | Owner of *Northstar Technologies*, active applications (Stripe, Vercel, Linear), courses, and timers. |
| **Teammate Alex** | `alex.teammate@daymark.app` | `Daymark2026!` | Admin in *Northstar Technologies* for testing task reassignment, mentions, and collaboration. |
| **Viewer Jordan** | `jordan.viewer@daymark.app` | `Daymark2026!` | Viewer in *Northstar Technologies* for testing read-only role permission boundaries. |

*Quick Demo Fill: On the sign-in page, click **"Fill Demo"** to populate the credentials instantly.*

---

## Testing & Automated Verification

Run the full automated test suite covering authentication, privacy boundaries, permissions, blocker validation, recurrence, timers, and security:
```bash
npm test
```
The test suite verifies:
- Database seeding integrity.
- Password complexity requirements and email format validation.
- Cross-user privacy isolation (User B cannot read User A's private applications, courses, links, or tasks).
- Workspace last-owner protection (preventing removal or demotion of the final owner).
- Task blocker explanation requirement and unblocking cleanup.
- Safe recurrence scheduling upon task completion.
- Course completion guardrails when incomplete lessons exist.
- Timestamp-based timer precision and tab suspension tolerance.
- Streak calculation across daily sessions in user timezones.
- Rejection of unsafe URL schemes (`javascript:`, `data:`).
- Session invalidation upon password reset.

---

## Building for Production

```bash
npm run build
npm start
```

---

## Known Limitations & Production Integrations

1. **Email Delivery**: In this local development environment, outgoing verification and reset emails are simulated. Secure single-use tokens are generated in the database and surfaced for development testing in local responses/logs. For production, connect an SMTP provider (e.g., Postmark, Resend, AWS SES) in `src/app/api/auth/`.
2. **File Storage**: The resume and cover letter fields currently support external secure URLs. For direct file binary uploads, integrate S3-compatible object storage (e.g., AWS S3, Cloudflare R2) using presigned upload URLs.
3. **Push Notifications**: Browser notifications are fully functional for active browser sessions. For guaranteed offline push notifications when the browser is closed, integrate a Web Push VAPID service worker or mobile push notification service.
