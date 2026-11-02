"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  Play,
  Trash2,
  ExternalLink,
  AlertCircle,
  CheckSquare,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Modal } from "@/components/Modal";
import { formatDateInTimezone, formatDateTimeInTimezone } from "@/lib/date-utils";

export default function CourseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lesson modal
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonUrl, setLessonUrl] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");

  // Study session modal
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState("45");
  const [sessionNotes, setSessionNotes] = useState("");
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Linked task modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");

  const loadCourse = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${params.id}`);
      if (!res.ok) {
        setError("Course not found.");
      } else {
        const json = await res.json();
        setCourse(json.course);
      }
    } catch {
      setError("Failed to load course details.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const handleLessonStatusToggle = async (lessonId: string, currentStatus: string) => {
    const next = currentStatus === "COMPLETE" ? "IN_PROGRESS" : "COMPLETE";
    try {
      await fetch(`/api/courses/${params.id}/lessons`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, status: next }),
      });
      loadCourse();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim()) return;

    try {
      await fetch(`/api/courses/${params.id}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: lessonTitle.trim(),
          resourceUrl: lessonUrl.trim() || null,
          sectionId: selectedSectionId || null,
        }),
      });
      setLessonModalOpen(false);
      setLessonTitle("");
      setLessonUrl("");
      loadCourse();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogStudySession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSessionError(null);

    const mins = parseInt(durationMinutes, 10);
    if (isNaN(mins) || mins <= 0) {
      setSessionError("Duration must be a positive number of minutes.");
      return;
    }

    try {
      const res = await fetch(`/api/courses/${params.id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMinutes: mins,
          notes: sessionNotes.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setSessionError(json.error || "Failed to log session.");
      } else {
        setSessionModalOpen(false);
        setDurationMinutes("45");
        setSessionNotes("");
        loadCourse();
      }
    } catch {
      setSessionError("A network error occurred.");
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
          linkedCourseId: params.id,
          tags: `course,learning`,
        }),
      });
      setTaskModalOpen(false);
      setTaskTitle("");
      setTaskDueDate("");
      loadCourse();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCourse = async () => {
    if (!confirm(`Are you sure you want to delete the course "${course.name}"?`)) return;
    try {
      const res = await fetch(`/api/courses/${params.id}`, { method: "DELETE" });
      if (res.ok) router.push("/courses");
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-8 text-center text-sm text-slate-500">Loading course...</div>;
  if (error || !course) return <div className="p-8 text-center text-sm text-red-500">{error}</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "Courses", href: "/courses" },
          { label: course.name },
        ]}
      />

      {/* Course Header */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-purple-600 dark:text-purple-400">
                {course.provider || "Self-Paced"}
              </span>
              {course.courseUrl && (
                <a
                  href={course.courseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Open Course Website"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-slate-950 dark:text-white mt-1">
              {course.name}
            </h1>
            {course.description && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 max-w-2xl">
                {course.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSessionModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Log Study Session</span>
            </button>
            <button
              onClick={() => setLessonModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Lesson</span>
            </button>
            <button
              onClick={handleDeleteCourse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
              title="Delete course"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress & Target Overview */}
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-1">Completion Progress</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${course.progressPercent}%` }}
                />
              </div>
              <span className="font-bold">{course.progressPercent}%</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Lessons Completed</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {course.completedLessons} of {course.totalLessons} lessons
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Target Completion Date</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {course.targetCompletionDate
                ? formatDateInTimezone(course.targetCompletionDate, user?.timezone)
                : "Not set"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Curriculum & Lessons List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600" />
                <span>Curriculum & Lessons</span>
              </h2>
              <button
                onClick={() => setLessonModalOpen(true)}
                className="text-xs text-purple-600 font-semibold hover:underline"
              >
                + New Lesson
              </button>
            </div>

            {/* Sections and Lessons */}
            <div className="space-y-4">
              {course.sections?.map((section: any) => (
                <div
                  key={section.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2 text-xs"
                >
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {section.title}
                  </div>

                  <div className="space-y-1.5">
                    {section.lessons?.map((lesson: any) => (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <button
                            onClick={() => handleLessonStatusToggle(lesson.id, lesson.status)}
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              lesson.status === "COMPLETE"
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            {lesson.status === "COMPLETE" && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                          <span
                            className={`truncate ${
                              lesson.status === "COMPLETE"
                                ? "line-through text-slate-400"
                                : "font-medium text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {lesson.title}
                          </span>
                        </div>

                        {lesson.resourceUrl && (
                          <a
                            href={lesson.resourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:text-purple-700 ml-2"
                            title="Open Lesson Resource"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes, Questions, and Takeaways */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] text-xs space-y-1.5">
              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                Study Notes
              </span>
              <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">
                {course.notes || "No notes added yet."}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] text-xs space-y-1.5">
              <span className="font-bold text-amber-600 dark:text-amber-400 block flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Questions</span>
              </span>
              <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">
                {course.questions || "No open questions."}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] text-xs space-y-1.5">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 block flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Key Takeaways</span>
              </span>
              <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">
                {course.keyTakeaways || "No takeaways recorded yet."}
              </p>
            </div>
          </div>
        </div>

        {/* Study Sessions History (1 col) */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Recent Study Sessions</span>
              </h2>
            </div>

            {course.studySessions?.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                No study sessions logged yet.
              </div>
            ) : (
              <div className="space-y-2">
                {course.studySessions?.map((s: any) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-900 dark:text-slate-100">
                        {s.durationMinutes} Minutes
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {formatDateInTimezone(s.startedAt, user?.timezone)}
                      </span>
                    </div>
                    {s.notes && (
                      <p className="text-[11px] text-slate-500 italic">"{s.notes}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linked Tasks */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-500" />
                <span>Linked Tasks ({course.linkedTasks?.length || 0})</span>
              </h2>
              <button
                onClick={() => setTaskModalOpen(true)}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                + Add Task
              </button>
            </div>

            <div className="space-y-2">
              {course.linkedTasks?.map((t: any) => (
                <Link
                  key={t.id}
                  href={`/tasks?selected=${t.id}`}
                  className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 block text-xs hover:border-brand-500"
                >
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {t.title}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Status: {t.status}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Log Study Session */}
      <Modal
        isOpen={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        title="Log Course Study Session"
      >
        {sessionError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {sessionError}
          </div>
        )}

        <form onSubmit={handleLogStudySession} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Study Duration (Minutes) *
            </label>
            <input
              type="number"
              min="1"
              max="1440"
              required
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Session Notes & Key Concepts
            </label>
            <textarea
              rows={3}
              placeholder="What topics or lessons did you cover? Any difficult concepts?"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setSessionModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg font-semibold bg-purple-600 text-white hover:bg-purple-700 shadow-xs"
            >
              Record Session
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Lesson */}
      <Modal
        isOpen={lessonModalOpen}
        onClose={() => setLessonModalOpen(false)}
        title="Add Lesson to Curriculum"
      >
        <form onSubmit={handleAddLesson} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lesson Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Chapter 4: Log Compaction & Invariants"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Resource / Lecture Link
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={lessonUrl}
              onChange={(e) => setLessonUrl(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Section
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              {course.sections?.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setLessonModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg font-semibold bg-purple-600 text-white hover:bg-purple-700 shadow-xs"
            >
              Save Lesson
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Linked Task */}
      <Modal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title={`Add Learning Task for ${course.name}`}
      >
        <form onSubmit={handleCreateLinkedTask} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Implement Raft leader election lab in Go"
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

