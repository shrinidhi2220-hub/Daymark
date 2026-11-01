"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Search,
  ExternalLink,
  Clock,
  CheckCircle2,
  Play,
  RotateCcw,
  Archive,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { formatDateInTimezone } from "@/lib/date-utils";
import { isValidHttpUrl } from "@/lib/validations";

const STATUS_FILTERS = [
  { id: "ALL", label: "All Courses" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "NOT_STARTED", label: "Not Started" },
  { id: "PAUSED", label: "Paused" },
  { id: "COMPLETE", label: "Completed" },
];

export default function CoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // New Course Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState({
    name: "",
    provider: "",
    subjectCategory: "",
    courseUrl: "",
    description: "",
    targetCompletionDate: "",
    status: "NOT_STARTED",
  });

  const loadCourses = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (showArchived) params.set("archived", "true");
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/courses?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setCourses(json.courses || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showArchived, searchQuery]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!courseForm.name.trim()) {
      setFormError("Course name is required.");
      return;
    }

    if (courseForm.courseUrl && !isValidHttpUrl(courseForm.courseUrl)) {
      setFormError("Course URL must be a valid http:// or https:// URL.");
      return;
    }

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseForm),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || "Failed to create course.");
      } else {
        setCreateModalOpen(false);
        setCourseForm({
          name: "",
          provider: "",
          subjectCategory: "",
          courseUrl: "",
          description: "",
          targetCompletionDate: "",
          status: "NOT_STARTED",
        });
        loadCourses();
      }
    } catch {
      setFormError("An unexpected error occurred.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <span>Courses & Learning</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track course curricula, lesson completion, and log study sessions accurately.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Course</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search courses, providers, subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
              showArchived
                ? "bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:border-purple-800 dark:text-purple-200 font-semibold"
                : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{showArchived ? "Archived Courses" : "Show Archived"}</span>
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {STATUS_FILTERS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-medium shrink-0 transition-colors ${
              statusFilter === tab.id
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses found"
          description="Track books, online courses, tutorials, and certifications with lesson checkpoints."
          actionLabel="+ Add Course"
          onAction={() => setCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <div
              key={course.id}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs flex flex-col justify-between space-y-4 hover:border-purple-500 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[11px] font-semibold uppercase text-purple-600 dark:text-purple-400">
                    {course.provider || "Self-Paced"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      course.status === "COMPLETE"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : course.status === "IN_PROGRESS"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {course.status.replace("_", " ")}
                  </span>
                </div>

                <Link
                  href={`/courses/${course.id}`}
                  className="text-base font-bold text-slate-950 dark:text-white hover:text-purple-600 block line-clamp-2"
                >
                  {course.name}
                </Link>

                {course.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1.5">
                    {course.description}
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    <span>
                      {course.completedLessons} of {course.totalLessons} lessons completed
                    </span>
                    <span className="font-bold">{course.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${course.progressPercent}%` }}
                    />
                  </div>
                </div>

                {course.nextLesson && (
                  <div className="p-2 rounded bg-purple-50/60 dark:bg-purple-950/30 text-[11px] text-purple-900 dark:text-purple-200 truncate">
                    <span className="font-bold mr-1">Next:</span>
                    <span>{course.nextLesson.title}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    {course.targetCompletionDate
                      ? `Target: ${formatDateInTimezone(course.targetCompletionDate, user?.timezone)}`
                      : "No target date"}
                  </span>
                  <Link
                    href={`/courses/${course.id}`}
                    className="flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    <span>View Curriculum</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add Course */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add New Course"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateCourse} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Course Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Distributed Systems in Go"
              value={courseForm.name}
              onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Provider / Platform
              </label>
              <input
                type="text"
                placeholder="e.g. MIT OpenCourseWare, Coursera"
                value={courseForm.provider}
                onChange={(e) => setCourseForm({ ...courseForm, provider: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subject Category
              </label>
              <input
                type="text"
                placeholder="e.g. Computer Science, Architecture"
                value={courseForm.subjectCategory}
                onChange={(e) => setCourseForm({ ...courseForm, subjectCategory: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Course URL
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={courseForm.courseUrl}
              onChange={(e) => setCourseForm({ ...courseForm, courseUrl: e.target.value })}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Initial Status
              </label>
              <select
                value={courseForm.status}
                onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETE">Complete</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Completion Date
              </label>
              <input
                type="date"
                value={courseForm.targetCompletionDate}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, targetCompletionDate: e.target.value })
                }
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

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
              className="px-5 py-2 rounded-lg font-semibold bg-purple-600 text-white hover:bg-purple-700 shadow-xs"
            >
              Save Course
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
