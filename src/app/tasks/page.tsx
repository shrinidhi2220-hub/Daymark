"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List as ListIcon,
  Calendar as CalendarIcon,
  AlertTriangle,
  Clock,
  User,
  MessageSquare,
  Tag,
  ArrowUpDown,
  Send,
  Trash2,
  CheckCircle2,
  Folder,
  Link as LinkIcon,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { formatDateInTimezone, formatDateTimeInTimezone } from "@/lib/date-utils";

const STATUSES = [
  { id: "TODO", label: "To Do", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  { id: "IN_PROGRESS", label: "In Progress", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" },
  { id: "BLOCKED", label: "Blocked", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" },
  { id: "DONE", label: "Done", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" },
];

const PRIORITIES = [
  { id: "LOW", label: "Low", color: "text-slate-500" },
  { id: "NORMAL", label: "Normal", color: "text-blue-500" },
  { id: "HIGH", label: "High", color: "text-amber-500" },
  { id: "URGENT", label: "Urgent", color: "text-red-500 font-bold" },
];

function TasksContent() {
  const searchParams = useSearchParams();
  const preselectedTaskId = searchParams.get("selected");
  const projectIdParam = searchParams.get("projectId");

  const { user, workspaces, selectedWorkspaceId } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Views
  const [viewMode, setViewMode] = useState<"BOARD" | "LIST" | "MY_TASKS">("BOARD");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("dueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Selected Task Modal (Detail & Comments)
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [newComment, setNewComment] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  // Blocker Dialog Modal
  const [blockerModalTask, setBlockerModalTask] = useState<any | null>(null);
  const [blockerReasonInput, setBlockerReasonInput] = useState("");

  // Create Task Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "NORMAL",
    status: "TODO",
    dueDate: "",
    tags: "",
    recurrenceRule: "NONE",
    projectId: projectIdParam || "",
    assigneeId: "",
  });

  const loadTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedWorkspaceId) params.set("workspaceId", selectedWorkspaceId);
      if (viewMode === "MY_TASKS") params.set("myTasks", "true");
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (priorityFilter !== "ALL") params.set("priority", priorityFilter);
      if (projectIdParam) params.set("projectId", projectIdParam);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTasks(json.tasks || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedWorkspaceId, viewMode, statusFilter, priorityFilter, projectIdParam, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Open preselected task if passed in query param
  useEffect(() => {
    if (preselectedTaskId) {
      fetch(`/api/tasks/${preselectedTaskId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.task) setSelectedTask(data.task);
        })
        .catch(() => {});
    }
  }, [preselectedTaskId]);

  const handleStatusChange = async (task: any, newStatus: string) => {
    // If setting to BLOCKED, require explanation
    if (newStatus === "BLOCKED") {
      setBlockerModalTask(task);
      setBlockerReasonInput(task.blockerReason || "");
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        loadTasks();
        if (selectedTask?.id === task.id) {
          refreshSelectedTask(task.id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const submitBlockerExplanation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockerModalTask || !blockerReasonInput.trim()) return;

    try {
      await fetch(`/api/tasks/${blockerModalTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "BLOCKED",
          blockerReason: blockerReasonInput.trim(),
        }),
      });
      setBlockerModalTask(null);
      setBlockerReasonInput("");
      loadTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const refreshSelectedTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTask(data.task);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newComment.trim()) return;

    try {
      await fetch(`/api/tasks/${selectedTask.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      setNewComment("");
      refreshSelectedTask(selectedTask.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newSubtaskTitle.trim()) return;

    try {
      await fetch(`/api/tasks/${selectedTask.id}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newSubtaskTitle.trim() }),
      });
      setNewSubtaskTitle("");
      refreshSelectedTask(selectedTask.id);
      loadTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentStatus: string) => {
    if (!selectedTask) return;
    const next = currentStatus === "DONE" ? "TODO" : "DONE";
    try {
      await fetch(`/api/tasks/${selectedTask.id}/subtasks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtaskId, status: next }),
      });
      refreshSelectedTask(selectedTask.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskForm.title.trim(),
          description: taskForm.description ? taskForm.description.trim() : null,
          priority: taskForm.priority,
          status: taskForm.status,
          dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : null,
          tags: taskForm.tags ? taskForm.tags.trim() : null,
          recurrenceRule: taskForm.recurrenceRule,
          workspaceId:
            selectedWorkspaceId === "personal" || selectedWorkspaceId === "all"
              ? null
              : selectedWorkspaceId,
          projectId: taskForm.projectId || null,
          assigneeId: taskForm.assigneeId || null,
        }),
      });

      if (res.ok) {
        setCreateModalOpen(false);
        setTaskForm({
          title: "",
          description: "",
          priority: "NORMAL",
          status: "TODO",
          dueDate: "",
          tags: "",
          recurrenceRule: "NONE",
          projectId: "",
          assigneeId: "",
        });
        loadTasks();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      setSelectedTask(null);
      loadTasks();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Tasks & Projects</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Organize personal to-dos and team tasks with subtasks, blockers, and comments.
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
            >
              <ListIcon className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode("MY_TASKS")}
              className={`p-1.5 rounded flex items-center gap-1 ${
                viewMode === "MY_TASKS"
                  ? "bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">My Tasks</span>
            </button>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search tasks, descriptions, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            <option value="dueDate">Sort: Due Date</option>
            <option value="priority">Sort: Priority</option>
            <option value="title">Sort: Title</option>
            <option value="status">Sort: Status</option>
          </select>
        </div>
      </div>

      {/* Main Task List / Board */}
      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks found"
          description="Create your first task or clear your search filters."
          actionLabel="+ Create Task"
          onAction={() => setCreateModalOpen(true)}
        />
      ) : viewMode === "BOARD" ? (
        /* Kanban Board */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {STATUSES.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="bg-slate-100/70 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-2 min-h-[350px]"
              >
                <div className="flex items-center justify-between px-1 py-0.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {col.label}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {colTasks.map((task) => {
                    const isOverdue =
                      task.dueDate &&
                      new Date(task.dueDate) < new Date() &&
                      task.status !== "DONE";

                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="p-3 bg-white dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/70 shadow-2xs space-y-2 text-xs cursor-pointer hover:border-brand-500 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-bold text-slate-900 dark:text-slate-100 hover:text-brand-600 line-clamp-2">
                            {task.title}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                              task.priority === "URGENT"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                : task.priority === "HIGH"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        {task.blockerReason && (
                          <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{task.blockerReason}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          {task.dueDate ? (
                            <span className={isOverdue ? "text-rose-600 font-semibold" : ""}>
                              Due: {formatDateInTimezone(task.dueDate, user?.timezone)}
                            </span>
                          ) : (
                            <span>No due date</span>
                          )}

                          <div className="flex items-center gap-2">
                            {task._count?.comments > 0 && (
                              <span className="flex items-center gap-0.5">
                                <MessageSquare className="w-3 h-3" />
                                {task._count.comments}
                              </span>
                            )}
                            {task.workspace ? (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                {task.workspace.name}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] font-semibold">
                                Personal
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Direct Accessible Status Changer Dropdown */}
                        <div
                          className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task, e.target.value)}
                            aria-label={`Change status for ${task.title}`}
                            className="text-[11px] py-1 px-1.5 rounded bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-medium text-slate-700 dark:text-slate-200"
                          >
                            {STATUSES.map((s) => (
                              <option key={s.id} value={s.id}>
                                Move to: {s.label}
                              </option>
                            ))}
                          </select>

                          {task.assignee && (
                            <span
                              className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 font-bold text-[10px] flex items-center justify-center uppercase"
                              title={`Assigned to ${task.assignee.name}`}
                            >
                              {task.assignee.name.slice(0, 2)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List / My Tasks View */
        <div className="bg-white dark:bg-[#0d131f] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-500">
              <tr>
                <th className="py-3 px-4">Task Title</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Workspace / Project</th>
                <th className="py-3 px-4">Assignee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {task.title}
                    </span>
                    {task.blockerReason && (
                      <span className="block text-[11px] text-amber-600 mt-0.5">
                        Blocker: {task.blockerReason}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task, e.target.value)}
                      className="text-xs py-1 px-2 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
                    >
                      {STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-semibold ${
                        task.priority === "URGENT"
                          ? "text-rose-600"
                          : task.priority === "HIGH"
                          ? "text-amber-600"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {task.dueDate ? formatDateInTimezone(task.dueDate, user?.timezone) : "—"}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {task.workspace ? task.workspace.name : "Personal"}
                    {task.project && ` / ${task.project.name}`}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {task.assignee ? task.assignee.name : "Unassigned"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Task Detail & Comments */}
      {selectedTask && (
        <Modal
          isOpen={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
          title={selectedTask.title}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            {selectedTask.description && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 whitespace-pre-line">
                {selectedTask.description}
              </div>
            )}

            {selectedTask.blockerReason && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Current Blocker:</span>
                  <span>{selectedTask.blockerReason}</span>
                </div>
              </div>
            )}

            {/* Checklist / Subtasks Section */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                Checklist / Subtasks
              </span>

              <div className="space-y-1.5">
                {selectedTask.subtasks?.map((sub: any) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <button
                      onClick={() => handleToggleSubtask(sub.id, sub.status)}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        sub.status === "DONE"
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {sub.status === "DONE" && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                    <span
                      className={`flex-1 text-xs ${
                        sub.status === "DONE"
                          ? "line-through text-slate-400"
                          : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {sub.title}
                    </span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddSubtask} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add a checklist step..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Comments & Discussion */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                Discussion & Activity
              </span>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedTask.comments?.map((c: any) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {c.author.name}
                      </span>
                      <span className="text-slate-400">
                        {formatDateTimeInTimezone(c.createdAt, user?.timezone)}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">{c.content}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-lg bg-blue-600 text-white font-semibold flex items-center gap-1 hover:bg-blue-700"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => handleDeleteTask(selectedTask.id)}
                className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Task</span>
              </button>

              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Blocker Explanation Required */}
      {blockerModalTask && (
        <Modal
          isOpen={Boolean(blockerModalTask)}
          onClose={() => setBlockerModalTask(null)}
          title="Mark Task as Blocked"
        >
          <form onSubmit={submitBlockerExplanation} className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Please explain what is blocking this task so teammates and reviewers can assist.
            </p>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Blocker Explanation *
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Waiting on AWS VPC peering configuration from DevOps team..."
                value={blockerReasonInput}
                onChange={(e) => setBlockerReasonInput(e.target.value)}
                className="w-full text-sm p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBlockerModalTask(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 shadow-xs"
              >
                Mark as Blocked
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Create Task */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Task"
      >
        <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Implement idempotency key for webhook ingestion"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Context, requirements, and acceptance criteria..."
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Recurrence Rule
              </label>
              <select
                value={taskForm.recurrenceRule}
                onChange={(e) => setTaskForm({ ...taskForm, recurrenceRule: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="NONE">None (One-off)</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                placeholder="e.g. backend, security, api"
                value={taskForm.tags}
                onChange={(e) => setTaskForm({ ...taskForm, tags: e.target.value })}
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
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Create Task"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading tasks...</div>}>
      <TasksContent />
    </Suspense>
  );
}

