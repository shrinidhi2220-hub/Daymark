"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon,
  Calendar as CalendarIcon,
  Archive,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Clock,
  MapPin,
  DollarSign,
  AlertCircle,
  FileText,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { formatDateInTimezone } from "@/lib/date-utils";
import { isValidHttpUrl } from "@/lib/validations";

const STAGES = [
  { id: "SAVED", label: "Saved", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300" },
  { id: "PREPARING", label: "Preparing", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300" },
  { id: "APPLIED", label: "Applied", color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300" },
  { id: "INTERVIEWING", label: "Interviewing", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300" },
  { id: "OFFER", label: "Offer", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300" },
  { id: "REJECTED", label: "Rejected", color: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300" },
  { id: "WITHDRAWN", label: "Withdrawn", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300" },
];

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Filters & Views
  const [viewMode, setViewMode] = useState<"BOARD" | "LIST" | "CALENDAR">("BOARD");
  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // New Application Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    companyName: "",
    roleTitle: "",
    jobUrl: "",
    jobDescription: "",
    location: "",
    workArrangement: "NOT_SPECIFIED",
    employmentType: "FULL_TIME",
    salaryRange: "",
    currency: "USD",
    applicationDate: "",
    nextFollowUpDate: "",
    resumeUrl: "",
    resumeVersion: "",
    stage: "SAVED",
  });

  const loadApplications = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedStage !== "ALL") params.set("stage", selectedStage);
      if (showArchived) params.set("archived", "true");
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      const res = await fetch(`/api/applications?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setApplications(json.applications || []);
        setStageCounts(json.stageCounts || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedStage, showArchived, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleStageChange = async (appId: string, newStage: string) => {
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (res.ok) {
        loadApplications();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleArchive = async (appId: string, currentArchived: boolean) => {
    try {
      await fetch(`/api/applications/${appId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !currentArchived }),
      });
      loadApplications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.companyName.trim() || !formData.roleTitle.trim()) {
      setFormError("Company name and role title are required.");
      return;
    }

    if (formData.jobUrl && !isValidHttpUrl(formData.jobUrl)) {
      setFormError("Job listing URL must be a valid http:// or https:// URL.");
      return;
    }

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || "Failed to create application.");
      } else {
        setCreateModalOpen(false);
        setFormData({
          companyName: "",
          roleTitle: "",
          jobUrl: "",
          jobDescription: "",
          location: "",
          workArrangement: "NOT_SPECIFIED",
          employmentType: "FULL_TIME",
          salaryRange: "",
          currency: "USD",
          applicationDate: "",
          nextFollowUpDate: "",
          resumeUrl: "",
          resumeVersion: "",
          stage: "SAVED",
        });
        loadApplications();
      }
    } catch {
      setFormError("An unexpected network error occurred.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Job Applications</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your personal job pipeline, track interview stages, and coordinate follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setViewMode("BOARD")}
              className={`p-1.5 rounded flex items-center gap-1 ${
                viewMode === "BOARD"
                  ? "bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              title="Board View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              onClick={() => setViewMode("LIST")}
              className={`p-1.5 rounded flex items-center gap-1 ${
                viewMode === "LIST"
                  ? "bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode("CALENDAR")}
              className={`p-1.5 rounded flex items-center gap-1 ${
                viewMode === "CALENDAR"
                  ? "bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              title="Calendar & Deadlines View"
            >
              <CalendarIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Deadlines</span>
            </button>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Application</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search company, role, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Sorting & Archive Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-slate-500">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
            >
              <option value="updatedAt">Sort: Recently Updated</option>
              <option value="company">Sort: Company</option>
              <option value="stage">Sort: Stage</option>
              <option value="date">Sort: Application Date</option>
              <option value="nextAction">Sort: Next Action Date</option>
            </select>
          </div>

          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
              showArchived
                ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-200 font-semibold"
                : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{showArchived ? "Showing Archived" : "Show Archived"}</span>
            {stageCounts.ARCHIVED > 0 && <span>({stageCounts.ARCHIVED})</span>}
          </button>
        </div>
      </div>

      {/* Stage Tabs (Quick Filter) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setSelectedStage("ALL")}
          className={`px-3 py-1.5 rounded-lg font-medium shrink-0 transition-colors ${
            selectedStage === "ALL"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
          }`}
        >
          All Active ({stageCounts.ALL || 0})
        </button>

        {STAGES.map((st) => (
          <button
            key={st.id}
            onClick={() => setSelectedStage(st.id)}
            className={`px-3 py-1.5 rounded-lg font-medium shrink-0 flex items-center gap-1.5 transition-colors ${
              selectedStage === st.id
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            <span>{st.label}</span>
            <span className="opacity-75 text-[10px]">({stageCounts[st.id] || 0})</span>
          </button>
        ))}
      </div>

      {/* Applications Views */}
      {applications.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={showArchived ? "No archived applications" : "No job applications found"}
          description={
            showArchived
              ? "Archived applications will appear here when you archive them."
              : "Start tracking target companies, interview rounds, and follow-up deadlines."
          }
          actionLabel="+ Add Application"
          onAction={() => setCreateModalOpen(true)}
        />
      ) : viewMode === "BOARD" ? (
        /* Board Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5 items-start overflow-x-auto">
          {STAGES.map((col) => {
            const colApps = applications.filter((app) => app.stage === col.id);
            return (
              <div
                key={col.id}
                className="bg-slate-100/70 dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-2 min-h-[300px]"
              >
                <div className="flex items-center justify-between px-1.5 py-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {col.label}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {colApps.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {colApps.map((app) => (
                    <div
                      key={app.id}
                      className="p-3 bg-white dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/70 shadow-2xs space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <Link
                          href={`/applications/${app.id}`}
                          className="font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 transition-colors"
                        >
                          {app.companyName}
                        </Link>
                        {app.jobUrl && (
                          <a
                            href={app.jobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                            title="Open job link"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      <div className="text-slate-600 dark:text-slate-300 font-medium">
                        {app.roleTitle}
                      </div>

                      {app.location && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{app.location}</span>
                        </div>
                      )}

                      {app.salaryRange && (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          <DollarSign className="w-3 h-3 shrink-0" />
                          <span>{app.salaryRange}</span>
                        </div>
                      )}

                      {/* Accessible Stage Changer Dropdown */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                        <select
                          value={app.stage}
                          onChange={(e) => handleStageChange(app.id, e.target.value)}
                          aria-label={`Change stage for ${app.companyName}`}
                          className="text-[11px] py-1 px-1.5 rounded bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
                        >
                          {STAGES.map((s) => (
                            <option key={s.id} value={s.id}>
                              Move to: {s.label}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => handleToggleArchive(app.id, app.isArchived)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                          title={app.isArchived ? "Restore application" : "Archive application"}
                        >
                          {app.isArchived ? (
                            <RotateCcw className="w-3.5 h-3.5" />
                          ) : (
                            <Archive className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === "LIST" ? (
        /* List View */
        <div className="bg-white dark:bg-[#0d131f] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-500">
                <tr>
                  <th className="py-3 px-4">Company & Role</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Work / Location</th>
                  <th className="py-3 px-4">Compensation</th>
                  <th className="py-3 px-4">Next Action</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/applications/${app.id}`}
                        className="font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600"
                      >
                        {app.companyName}
                      </Link>
                      <div className="text-slate-500">{app.roleTitle}</div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={app.stage}
                        onChange={(e) => handleStageChange(app.id, e.target.value)}
                        className="text-xs py-1 px-2 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
                      >
                        {STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      <div>{app.workArrangement.replace("_", " ")}</div>
                      <div className="text-[11px] text-slate-400">{app.location || "—"}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-emerald-600 dark:text-emerald-400">
                      {app.salaryRange ? `${app.salaryRange} ${app.currency}` : "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {app.nextFollowUpDate
                        ? formatDateInTimezone(app.nextFollowUpDate, user?.timezone)
                        : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/applications/${app.id}`}
                          className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleToggleArchive(app.id, app.isArchived)}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title={app.isArchived ? "Restore" : "Archive"}
                        >
                          {app.isArchived ? (
                            <RotateCcw className="w-3.5 h-3.5" />
                          ) : (
                            <Archive className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Calendar / Deadlines View */
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f]">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-emerald-500" />
              <span>Upcoming Interviews & Follow-Up Deadlines</span>
            </h3>

            <div className="space-y-3">
              {applications
                .filter((a) => a.nextFollowUpDate || a.interviewRounds?.length > 0)
                .map((app) => (
                  <div
                    key={app.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs flex items-center justify-between"
                  >
                    <div>
                      <Link
                        href={`/applications/${app.id}`}
                        className="font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600"
                      >
                        {app.companyName} — {app.roleTitle}
                      </Link>
                      {app.nextFollowUpDate && (
                        <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                          Follow-up date: {formatDateInTimezone(app.nextFollowUpDate, user?.timezone)}
                        </div>
                      )}
                      {app.interviewRounds?.map((round: any) => (
                        <div
                          key={round.id}
                          className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5"
                        >
                          Interview: {round.roundTitle} on{" "}
                          {formatDateInTimezone(round.interviewDate, user?.timezone)} ({round.format})
                        </div>
                      ))}
                    </div>
                    <Link
                      href={`/applications/${app.id}`}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 shadow-xs"
                    >
                      Open
                    </Link>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Job Application */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add Job Application"
        maxWidth="max-w-2xl"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Stripe"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Role / Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Staff Software Engineer"
                value={formData.roleTitle}
                onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Initial Stage
              </label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Work Arrangement
              </label>
              <select
                value={formData.workArrangement}
                onChange={(e) => setFormData({ ...formData, workArrangement: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ON_SITE">On-Site</option>
                <option value="NOT_SPECIFIED">Not Specified</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Location
              </label>
              <input
                type="text"
                placeholder="e.g. San Francisco, CA / Remote"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Salary Range & Currency
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 180,000 - 220,000"
                  value={formData.salaryRange}
                  onChange={(e) => setFormData({ ...formData, salaryRange: e.target.value })}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
                <input
                  type="text"
                  placeholder="USD"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-20 text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 uppercase"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Job Listing URL
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={formData.jobUrl}
              onChange={(e) => setFormData({ ...formData, jobUrl: e.target.value })}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Application Date
              </label>
              <input
                type="date"
                value={formData.applicationDate}
                onChange={(e) => setFormData({ ...formData, applicationDate: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Next Follow-Up Date
              </label>
              <input
                type="date"
                value={formData.nextFollowUpDate}
                onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
            >
              Save Application
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
