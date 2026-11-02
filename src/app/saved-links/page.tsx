"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bookmark,
  Plus,
  Search,
  ExternalLink,
  Copy,
  Check,
  Play,
  Pause,
  Pin,
  Flame,
  Award,
  Archive,
  RotateCcw,
  Trash2,
  Clock,
  CheckCircle2,
  Globe,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { useTimer } from "@/components/TimerContext";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { isValidHttpUrl } from "@/lib/validations";
import { formatDuration } from "@/lib/date-utils";

const CATEGORIES = [
  "ALL",
  "YouTube",
  "LeetCode",
  "Courses",
  "Job Search",
  "Documentation",
  "Custom",
];

export default function SavedLinksPage() {
  const { user } = useAuth();
  const { activeTimer, startTimer, pauseTimer, resumeTimer, finishTimer } = useTimer();

  const [links, setLinks] = useState<any[]>([]);
  const [globalStreak, setGlobalStreak] = useState<{ currentStreak: number; bestStreak: number }>({
    currentStreak: 0,
    bestStreak: 0,
  });
  const [loading, setLoading] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Link Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    description: "",
    category: "Documentation",
    customCategory: "",
    dailyGoalDurationMinutes: "30",
    isPinned: false,
  });

  const loadLinks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);
      if (showArchived) params.set("archived", "true");
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/saved-links?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setLinks(json.links || []);
        if (json.globalStreak) setGlobalStreak(json.globalStreak);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, showArchived, searchQuery]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    try {
      await fetch(`/api/saved-links/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !currentPinned }),
      });
      loadLinks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleArchive = async (id: string, currentArchived: boolean) => {
    try {
      await fetch(`/api/saved-links/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !currentArchived }),
      });
      loadLinks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualComplete = async (savedLinkId: string) => {
    try {
      await fetch("/api/saved-links/manual-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savedLinkId }),
      });
      loadLinks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this saved link?")) return;
    try {
      await fetch(`/api/saved-links/${id}`, { method: "DELETE" });
      loadLinks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.title.trim() || !formData.url.trim()) {
      setFormError("Title and URL are required.");
      return;
    }

    if (!isValidHttpUrl(formData.url)) {
      setFormError("Must be a valid http:// or https:// URL.");
      return;
    }

    try {
      const res = await fetch("/api/saved-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          dailyGoalDurationMinutes: formData.dailyGoalDurationMinutes
            ? parseInt(formData.dailyGoalDurationMinutes, 10)
            : null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || "Failed to save link.");
      } else {
        setCreateModalOpen(false);
        setFormData({
          title: "",
          url: "",
          description: "",
          category: "Documentation",
          customCategory: "",
          dailyGoalDurationMinutes: "30",
          isPinned: false,
        });
        loadLinks();
      }
    } catch {
      setFormError("Network error.");
    }
  };

  const getDomain = (rawUrl: string) => {
    try {
      return new URL(rawUrl).hostname.replace(/^www\./, "");
    } catch {
      return rawUrl;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-amber-500" />
            <span>Saved Links & Daily Goals</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Curate learning resources and documentation, set daily time targets, and maintain streaks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Streak Counters */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50/70 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="font-bold">{globalStreak.currentStreak} Day Streak</span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400">
              (Best: {globalStreak.bestStreak})
            </span>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Link</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search links by title, url, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
            showArchived
              ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-200 font-semibold"
              : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>{showArchived ? "Archived Links" : "Show Archived"}</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-lg font-medium shrink-0 transition-colors ${
              categoryFilter === cat
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            {cat === "ALL" ? "All Categories" : cat}
          </button>
        ))}
      </div>

      {/* Links Grid */}
      {links.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No saved links found"
          description="Save bookmarks for YouTube playlists, LeetCode sheets, or engineering documentation."
          actionLabel="+ Add Saved Link"
          onAction={() => setCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {links.map((link) => {
            const isTimerRunning = activeTimer?.savedLinkId === link.id;
            const domain = getDomain(link.url);

            return (
              <div
                key={link.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs flex flex-col justify-between space-y-3 hover:border-amber-500 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {link.category}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTogglePin(link.id, link.isPinned)}
                        className={`p-1 rounded ${
                          link.isPinned
                            ? "text-amber-500 fill-amber-500"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                        title={link.isPinned ? "Unpin link" : "Pin link"}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleCopy(link.id, link.url)}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="Copy link to clipboard"
                      >
                        {copiedId === link.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => handleToggleArchive(link.id, link.isArchived)}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title={link.isArchived ? "Restore" : "Archive"}
                      >
                        {link.isArchived ? (
                          <RotateCcw className="w-3.5 h-3.5" />
                        ) : (
                          <Archive className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Title & Domain Badge */}
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1 mb-1">
                    {link.title}
                  </h3>

                  {/* Safe Link Open with Destination Domain */}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-brand-600 dark:text-brand-400 hover:underline mb-2 font-mono"
                    title={`Opens ${link.url} in new tab`}
                  >
                    <Globe className="w-3 h-3" />
                    <span>{domain}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {link.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{link.description}</p>
                  )}
                </div>

                {/* Daily Goal & Timer Controls */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">
                      Goal: {link.dailyGoalDurationMinutes || 30} mins
                    </span>
                    {link.isCompletedToday ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed today</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        Today: {formatDuration(link.todayDurationSeconds)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {isTimerRunning ? (
                      <div className="flex-1 flex items-center justify-between bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-1.5">
                        <span className="font-semibold text-amber-800 dark:text-amber-200 text-xs animate-pulse">
                          Active in Top Bar
                        </span>
                        <button
                          onClick={finishTimer}
                          className="px-2 py-0.5 rounded bg-emerald-600 text-white font-semibold text-[11px]"
                        >
                          Finish
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => startTimer(link.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs transition-colors"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Start Timer</span>
                        </button>

                        {!link.isCompletedToday && (
                          <button
                            onClick={() => handleManualComplete(link.id)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                            title="Mark completed without timer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Saved Link */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add Saved Website or Daily Goal"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. System Design Primer"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              URL (http:// or https://) *
            </label>
            <input
              type="url"
              required
              placeholder="https://github.com/donnemartin/system-design-primer"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="Documentation">Documentation</option>
                <option value="LeetCode">LeetCode</option>
                <option value="YouTube">YouTube</option>
                <option value="Courses">Courses</option>
                <option value="Job Search">Job Search</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Daily Goal Duration (Minutes)
              </label>
              <input
                type="number"
                min="5"
                max="360"
                value={formData.dailyGoalDurationMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, dailyGoalDurationMinutes: e.target.value })
                }
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Notes, key references, or purpose..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={formData.isPinned}
              onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
              className="rounded text-amber-600 focus:ring-amber-500"
            />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Pin to top of list
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg font-semibold bg-amber-600 text-white hover:bg-amber-700 shadow-xs"
            >
              Save Link
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

