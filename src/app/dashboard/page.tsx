"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Briefcase,
  CheckSquare,
  BookOpen,
  Bookmark,
  Calendar,
  Clock,
  ArrowRight,
  Plus,
  Play,
  Check,
  AlertCircle,
  TrendingUp,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { useTimer } from "@/components/TimerContext";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { formatDateTimeInTimezone, formatDateInTimezone, formatDuration } from "@/lib/date-utils";

export default function DashboardPage() {
  const { user, selectedWorkspaceId, setSelectedWorkspaceId } = useAuth();
  const { startTimer, activeTimer } = useTimer();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [daysView, setDaysView] = useState<number>(7);
  const [cardPrefs, setCardPrefs] = useState<string[]>([
    "tasks",
    "interviews",
    "goals",
    "courses",
    "upcoming",
    "activity",
  ]);
  const [prefsModalOpen, setPrefsModalOpen] = useState(false);
  const [quickAddModal, setQuickAddModal] = useState<string | null>(null);

  // Quick add form states
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickTaskDueDate, setQuickTaskDueDate] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/dashboard?context=${encodeURIComponent(selectedWorkspaceId)}&days=${daysView}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.cardPreferences && Array.isArray(json.cardPreferences)) {
          setCardPrefs(json.cardPreferences);
        }
      }
    } catch (err) {
      console.error("Dashboard load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedWorkspaceId, daysView]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "DONE" ? "TODO" : "DONE";
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      loadDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quickTaskTitle.trim(),
          dueDate: quickTaskDueDate ? new Date(quickTaskDueDate).toISOString() : null,
          workspaceId: selectedWorkspaceId === "personal" || selectedWorkspaceId === "all" ? null : selectedWorkspaceId,
        }),
      });
      setQuickTaskTitle("");
      setQuickTaskDueDate("");
      setQuickAddModal(null);
      loadDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  const saveCardPreferences = async (newOrder: string[]) => {
    setCardPrefs(newOrder);
    try {
      await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboardCardOrder: newOrder.join(",") }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleCardVisibility = (cardKey: string) => {
    let next: string[];
    if (cardPrefs.includes(cardKey)) {
      next = cardPrefs.filter((k) => k !== cardKey);
    } else {
      next = [...cardPrefs, cardKey];
    }
    saveCardPreferences(next);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const counts = data?.summaryCounts || {
    overdueTasksCount: 0,
    todayTasksCount: 0,
    upcomingInterviewsCount: 0,
    coursesInProgressCount: 0,
    activeApplicationsCount: 0,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Greeting & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Daily Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {formatDateInTimezone(new Date(), user?.timezone, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Days view toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setDaysView(7)}
              className={`px-2.5 py-1 rounded font-medium ${
                daysView === 7
                  ? "bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDaysView(30)}
              className={`px-2.5 py-1 rounded font-medium ${
                daysView === 30
                  ? "bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              30 Days
            </button>
          </div>

          {/* Quick Add Menu */}
          <button
            onClick={() => setQuickAddModal("TASK")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>

          {/* Customize Cards Button */}
          <button
            onClick={() => setPrefsModalOpen(true)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Configure Dashboard Cards"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link
          href="/tasks"
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] hover:border-brand-500 transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Due Today & Overdue</span>
            <CheckSquare className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {counts.todayTasksCount + counts.overdueTasksCount}
            </span>
            {counts.overdueTasksCount > 0 && (
              <span className="text-xs font-semibold text-rose-500">
                ({counts.overdueTasksCount} overdue)
              </span>
            )}
          </div>
        </Link>

        <Link
          href="/applications"
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] hover:border-brand-500 transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Upcoming Interviews</span>
            <Calendar className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {counts.upcomingInterviewsCount}
          </div>
        </Link>

        <Link
          href="/courses"
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] hover:border-brand-500 transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Active Courses</span>
            <BookOpen className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {counts.coursesInProgressCount}
          </div>
        </Link>

        <Link
          href="/saved-links"
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] hover:border-brand-500 transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Daily Link Goals</span>
            <Bookmark className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {data?.goalsOverview?.length || 0}
          </div>
        </Link>
      </div>

      {/* Main Dashboard Cards (Configurable Order) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: Tasks Due Today & Overdue */}
        {cardPrefs.includes("tasks") && (
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Tasks Due Today & Overdue
                  </h2>
                </div>
                <Link
                  href="/tasks"
                  className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>View board</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {data?.overdueTasks?.length === 0 && data?.todayTasks?.length === 0 ? (
                <EmptyState
                  icon={CheckSquare}
                  title="All caught up!"
                  description="No tasks due today or overdue. Enjoy your clear schedule or plan ahead."
                  actionLabel="+ Create Task"
                  onAction={() => setQuickAddModal("TASK")}
                />
              ) : (
                <div className="space-y-2">
                  {/* Overdue tasks */}
                  {data?.overdueTasks?.map((task: any) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <button
                          onClick={() => toggleTaskStatus(task.id, task.status)}
                          className="w-4 h-4 rounded border border-red-400 flex items-center justify-center shrink-0 hover:bg-red-100"
                        >
                          {task.status === "DONE" && <Check className="w-3 h-3 text-red-600" />}
                        </button>
                        <div className="truncate">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block">
                            {task.title}
                          </span>
                          <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                            Overdue since {formatDateInTimezone(task.dueDate, user?.timezone)}
                          </span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 shrink-0">
                        {task.workspace ? task.workspace.name : "Personal"}
                      </span>
                    </div>
                  ))}

                  {/* Today tasks */}
                  {data?.todayTasks?.map((task: any) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <button
                          onClick={() => toggleTaskStatus(task.id, task.status)}
                          className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0 hover:bg-slate-200"
                        >
                          {task.status === "DONE" && <Check className="w-3 h-3 text-brand-600" />}
                        </button>
                        <div className="truncate">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block">
                            {task.title}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {task.priority} Priority • Due Today
                          </span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                        {task.workspace ? task.workspace.name : "Personal"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Card: Upcoming Interviews & Follow-ups */}
        {cardPrefs.includes("interviews") && (
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Interviews & Follow-Ups
                  </h2>
                </div>
                <Link
                  href="/applications"
                  className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>All applications</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {data?.upcomingInterviews?.length === 0 && data?.followUpsDue?.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="No interviews scheduled"
                  description="Keep your application pipeline active. Track interviews and schedule follow-ups."
                  actionLabel="View Applications"
                  onAction={() => (window.location.href = "/applications")}
                />
              ) : (
                <div className="space-y-2">
                  {data?.upcomingInterviews?.map((round: any) => (
                    <div
                      key={round.id}
                      className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {round.companyName} — {round.roundTitle}
                        </div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                          {formatDateTimeInTimezone(round.interviewDate, user?.timezone)} (
                          {round.format})
                        </div>
                        {round.interviewer && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Interviewer: {round.interviewer}
                          </div>
                        )}
                      </div>
                      <Link
                        href={`/applications/${round.jobApplicationId}`}
                        className="px-2.5 py-1 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-700 shrink-0 text-xs shadow-xs"
                      >
                        Prep
                      </Link>
                    </div>
                  ))}

                  {data?.followUpsDue?.map((app: any) => (
                    <div
                      key={app.id}
                      className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 text-xs flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          Follow-up: {app.companyName} ({app.roleTitle})
                        </div>
                        <div className="text-[11px] text-amber-700 dark:text-amber-300">
                          Target follow-up: {formatDateInTimezone(app.nextFollowUpDate, user?.timezone)}
                        </div>
                      </div>
                      <Link
                        href={`/applications/${app.id}`}
                        className="px-2 py-1 rounded border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40"
                      >
                        Open
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Card: Daily Learning & Link Goals with Timer */}
        {cardPrefs.includes("goals") && (
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Daily Learning & Saved Goals
                  </h2>
                </div>
                <Link
                  href="/saved-links"
                  className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>All links</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {data?.goalsOverview?.length === 0 ? (
                <EmptyState
                  icon={Bookmark}
                  title="No daily goals configured"
                  description="Save key websites, documentation, or study links and set daily focus time targets."
                  actionLabel="Add Saved Link"
                  onAction={() => (window.location.href = "/saved-links")}
                />
              ) : (
                <div className="space-y-2.5">
                  {data?.goalsOverview?.map((goal: any) => {
                    const isRunning = activeTimer?.savedLinkId === goal.id;
                    return (
                      <div
                        key={goal.id}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {goal.title}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {goal.category}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>Goal: {goal.dailyGoalDurationMinutes} mins</span>
                            {goal.isCompletedToday ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Done today
                              </span>
                            ) : (
                              <span>Today: {formatDuration(goal.todayDurationSeconds)}</span>
                            )}
                          </div>
                        </div>

                        {isRunning ? (
                          <span className="px-2.5 py-1 rounded bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300 font-semibold text-xs shrink-0 animate-pulse">
                            Active
                          </span>
                        ) : (
                          <button
                            onClick={() => startTimer(goal.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-brand-600 text-white font-medium hover:bg-brand-700 text-xs shrink-0 shadow-xs"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Timer</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Card: Courses & Next Lessons */}
        {cardPrefs.includes("courses") && (
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Course Goals & Next Lessons
                  </h2>
                </div>
                <Link
                  href="/courses"
                  className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>All courses</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {data?.coursesOverview?.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No active courses"
                  description="Track courses, syllabus sections, ordered lessons, and log study time."
                  actionLabel="Add Course"
                  onAction={() => (window.location.href = "/courses")}
                />
              ) : (
                <div className="space-y-3">
                  {data?.coursesOverview?.map((course: any) => (
                    <div
                      key={course.id}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/courses/${course.id}`}
                          className="font-bold text-slate-900 dark:text-slate-100 hover:text-brand-600 truncate"
                        >
                          {course.name}
                        </Link>
                        <span className="font-semibold text-slate-500 shrink-0 ml-2">
                          {course.progressPercent}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${course.progressPercent}%` }}
                        />
                      </div>

                      {course.nextLesson ? (
                        <div className="text-[11px] text-purple-700 dark:text-purple-300 flex items-center justify-between">
                          <span className="truncate">Next: {course.nextLesson.title}</span>
                          <Link
                            href={`/courses/${course.id}`}
                            className="font-semibold underline shrink-0 ml-2"
                          >
                            Resume
                          </Link>
                        </div>
                      ) : (
                        <div className="text-[11px] text-emerald-600 font-medium">
                          All current lessons completed!
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Card: Recent Activity Log */}
        {cardPrefs.includes("activity") && (
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Recent Activity (Authorized Only)
                </h2>
              </div>
            </div>

            {data?.recentActivity?.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                No recent activity recorded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {data?.recentActivity?.map((act: any) => (
                  <div
                    key={act.id}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0"></span>
                      <div className="truncate">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 mr-1.5">
                          {act.actor}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">{act.details}</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0 ml-3">
                      {formatDateTimeInTimezone(act.timestamp, user?.timezone)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Quick Add Task */}
      <Modal
        isOpen={quickAddModal === "TASK"}
        onClose={() => setQuickAddModal(null)}
        title="Quick Add Task"
      >
        <form onSubmit={handleQuickAddTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Follow up on system design notes"
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={quickTaskDueDate}
              onChange={(e) => setQuickTaskDueDate(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setQuickAddModal(null)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-sm"
            >
              Create Task
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Dashboard Cards Preferences */}
      <Modal
        isOpen={prefsModalOpen}
        onClose={() => setPrefsModalOpen(false)}
        title="Customize Dashboard Cards"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Choose which cards appear on your dashboard. Preferences are saved automatically.
          </p>

          {[
            { id: "tasks", label: "Tasks Due Today & Overdue" },
            { id: "interviews", label: "Interviews & Follow-Ups" },
            { id: "goals", label: "Daily Learning & Saved Goals" },
            { id: "courses", label: "Course Goals & Next Lessons" },
            { id: "activity", label: "Recent Activity Log" },
          ].map((item) => {
            const isChecked = cardPrefs.includes(item.id);
            return (
              <label
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer text-xs"
              >
                <span className="font-medium text-slate-800 dark:text-slate-200">{item.label}</span>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleCardVisibility(item.id)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
              </label>
            );
          })}

          <div className="flex justify-end pt-3">
            <button
              onClick={() => setPrefsModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white font-semibold text-xs hover:bg-brand-700 shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
