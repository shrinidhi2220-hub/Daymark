"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  User,
  Plus,
  Trash2,
  Archive,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  CheckSquare,
  AlertCircle,
  FileText,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Modal } from "@/components/Modal";
import { formatDateTimeInTimezone, formatDateInTimezone } from "@/lib/date-utils";

export default function ApplicationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interview modal
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [interviewTitle, setInterviewTitle] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewFormat, setInterviewFormat] = useState("Video (Google Meet)");
  const [interviewer, setInterviewer] = useState("");
  const [prepNotes, setPrepNotes] = useState("");

  // Create Linked Task modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");

  const loadApplication = useCallback(async () => {
    try {
      const res = await fetch(`/api/applications/${params.id}`);
      if (!res.ok) {
        setError("Application not found or permission denied.");
      } else {
        const json = await res.json();
        setApp(json.application);
      }
    } catch {
      setError("Failed to load application details.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  const handleStageChange = async (newStage: string) => {
    try {
      await fetch(`/api/applications/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      loadApplication();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewTitle.trim() || !interviewDate) return;

    try {
      await fetch(`/api/applications/${params.id}/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundTitle: interviewTitle.trim(),
          interviewDate: new Date(interviewDate).toISOString(),
          format: interviewFormat,
          interviewer: interviewer.trim() || null,
          preparationNotes: prepNotes.trim() || null,
          timezone: user?.timezone || "UTC",
        }),
      });
      setInterviewModalOpen(false);
      setInterviewTitle("");
      setInterviewDate("");
      setInterviewer("");
      setPrepNotes("");
      loadApplication();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateInterviewOutcome = async (roundId: string, outcome: string) => {
    try {
      await fetch(`/api/applications/${params.id}/interviews`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, outcome }),
      });
      loadApplication();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteInterview = async (roundId: string) => {
    if (!confirm("Remove this interview round?")) return;
    try {
      await fetch(`/api/applications/${params.id}/interviews`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId }),
      });
      loadApplication();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateLinkedTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle.trim(),
          dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : null,
          linkedJobApplicationId: params.id,
          tags: `job-search,${app.companyName.toLowerCase().replace(/\s+/g, "-")}`,
        }),
      });
      setTaskModalOpen(false);
      setTaskTitle("");
      setTaskDueDate("");
      loadApplication();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteApplication = async () => {
    if (!confirm(`Are you sure you want to delete the application for "${app.companyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/applications/${params.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/applications");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Loading application...</div>;
  }

  if (error || !app) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
          {error || "Application not found"}
        </h2>
        <Link href="/applications" className="text-xs text-brand-600 hover:underline">
          Return to Applications
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "Job Applications", href: "/applications" },
          { label: `${app.companyName} — ${app.roleTitle}` },
        ]}
      />

      {/* Main Header Card */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-950 dark:text-white">
                {app.companyName}
              </h1>
              {app.jobUrl && (
                <a
                  href={app.jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="View original job posting"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <p className="text-base font-medium text-slate-600 dark:text-slate-300 mt-1">
              {app.roleTitle}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Stage Selector */}
            <select
              value={app.stage}
              onChange={(e) => handleStageChange(e.target.value)}
              className="text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="SAVED">Saved</option>
              <option value="PREPARING">Preparing</option>
              <option value="APPLIED">Applied</option>
              <option value="INTERVIEWING">Interviewing</option>
              <option value="OFFER">Offer</option>
              <option value="REJECTED">Rejected</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </select>

            <button
              onClick={() => setInterviewModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Interview</span>
            </button>

            <button
              onClick={handleDeleteApplication}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
              title="Delete application"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metadata Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Location & Type</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {app.location || "Remote / Unspecified"} ({app.workArrangement})
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Salary Range</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {app.salaryRange ? `${app.salaryRange} ${app.currency}` : "Not listed"}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Applied Date</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {app.applicationDate ? formatDateInTimezone(app.applicationDate, user?.timezone) : "—"}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Next Follow-Up</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {app.nextFollowUpDate
                ? formatDateInTimezone(app.nextFollowUpDate, user?.timezone)
                : "None set"}
            </span>
          </div>
        </div>

        {/* Notes & Documents */}
        {(app.notes || app.resumeUrl || app.coverLetterUrl) && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs space-y-2">
            {app.notes && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
                <span className="font-bold block text-slate-900 dark:text-slate-100 mb-0.5">
                  Notes
                </span>
                <p className="whitespace-pre-line">{app.notes}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              {app.resumeUrl && (
                <a
                  href={app.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>Resume {app.resumeVersion ? `(${app.resumeVersion})` : ""}</span>
                </a>
              )}
              {app.coverLetterUrl && (
                <a
                  href={app.coverLetterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-500" />
                  <span>Cover Letter</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interview Rounds Manager */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span>Interview Rounds ({app.interviewRounds?.length || 0})</span>
            </h2>
            <button
              onClick={() => setInterviewModalOpen(true)}
              className="text-xs text-emerald-600 font-semibold hover:underline"
            >
              + Add Round
            </button>
          </div>

          {app.interviewRounds?.length === 0 ? (
            <div className="text-xs text-slate-400 py-6 text-center border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
              No interview rounds scheduled yet.
            </div>
          ) : (
            <div className="space-y-3">
              {app.interviewRounds?.map((round: any) => (
                <div
                  key={round.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {round.roundTitle}
                    </span>
                    <select
                      value={round.outcome}
                      onChange={(e) => handleUpdateInterviewOutcome(round.id, e.target.value)}
                      className="text-[11px] font-semibold py-0.5 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="PASSED">Passed</option>
                      <option value="FAILED">Failed</option>
                      <option value="PENDING">Pending Decision</option>
                    </select>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>
                      {formatDateTimeInTimezone(round.interviewDate, user?.timezone)} ({round.format})
                    </span>
                    {round.interviewer && <span>Interviewer: {round.interviewer}</span>}
                  </div>

                  {round.preparationNotes && (
                    <div className="p-2 rounded bg-white dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="font-semibold block text-slate-800 dark:text-slate-200 mb-0.5">
                        Prep Notes:
                      </span>
                      {round.preparationNotes}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleDeleteInterview(round.id)}
                      className="text-slate-400 hover:text-red-500 text-[11px]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Linked Preparation Tasks */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-500" />
              <span>Linked Prep Tasks ({app.linkedTasks?.length || 0})</span>
            </h2>
            <button
              onClick={() => setTaskModalOpen(true)}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              + Create Prep Task
            </button>
          </div>

          {app.linkedTasks?.length === 0 ? (
            <div className="text-xs text-slate-400 py-6 text-center border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
              No tasks linked to this application. Create preparation or follow-up tasks.
            </div>
          ) : (
            <div className="space-y-2">
              {app.linkedTasks?.map((task: any) => (
                <Link
                  key={task.id}
                  href={`/tasks?selected=${task.id}`}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between text-xs hover:border-brand-500 transition-colors"
                >
                  <div className="truncate">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block">
                      {task.title}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Status: {task.status} • Priority: {task.priority}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-800 shrink-0">
                    {task.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Schedule Interview */}
      <Modal
        isOpen={interviewModalOpen}
        onClose={() => setInterviewModalOpen(false)}
        title="Schedule Interview Round"
      >
        <form onSubmit={handleAddInterview} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Round Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. System Design Interview"
              value={interviewTitle}
              onChange={(e) => setInterviewTitle(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Format
              </label>
              <input
                type="text"
                placeholder="e.g. Video (Google Meet)"
                value={interviewFormat}
                onChange={(e) => setInterviewFormat(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Interviewer Name / Title
            </label>
            <input
              type="text"
              placeholder="e.g. David Evans (Staff Architect)"
              value={interviewer}
              onChange={(e) => setInterviewer(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Preparation Notes
            </label>
            <textarea
              rows={3}
              placeholder="Key concepts, architecture trade-offs, questions to ask the interviewer..."
              value={prepNotes}
              onChange={(e) => setPrepNotes(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setInterviewModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
            >
              Save Round & Create Reminder
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Linked Task */}
      <Modal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title={`Add Preparation Task for ${app.companyName}`}
      >
        <form onSubmit={handleCreateLinkedTask} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Review Raft consensus compaction paper"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setTaskModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-xs"
            >
              Create Linked Task
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

