"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Folder,
  CheckSquare,
  Shield,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";

export default function WorkspacesPage() {
  const { user, refreshUser } = useAuth();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Workspace Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const loadWorkspaces = useCallback(async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (res.ok) {
        const json = await res.json();
        setWorkspaces(json.workspaces || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Workspace name is required.");
      return;
    }

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || "Failed to create workspace.");
      } else {
        setCreateModalOpen(false);
        setName("");
        setDescription("");
        loadWorkspaces();
        refreshUser();
      }
    } catch {
      setFormError("A network error occurred.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            <span>Workspaces</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage shared team spaces, member permissions, project boards, and invitations.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Workspace Cards */}
      {workspaces.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No shared workspaces yet"
          description="Create a workspace to collaborate with teammates on shared projects and tasks."
          actionLabel="+ Create Workspace"
          onAction={() => setCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs flex flex-col justify-between space-y-4 hover:border-brand-500 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                    Role: {ws.role}
                  </span>
                  {ws.isArchived && (
                    <span className="text-[10px] text-amber-600 font-bold uppercase">
                      Archived
                    </span>
                  )}
                </div>

                <Link
                  href={`/workspaces/${ws.id}`}
                  className="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-brand-600 block line-clamp-1"
                >
                  {ws.name}
                </Link>

                {ws.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1.5">
                    {ws.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs space-y-3">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{ws.counts?.members || 1} members</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Folder className="w-3.5 h-3.5" />
                    <span>{ws.counts?.projects || 0} projects</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{ws.counts?.tasks || 0} tasks</span>
                  </span>
                </div>

                <Link
                  href={`/workspaces/${ws.id}`}
                  className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
                >
                  <span>Manage Workspace</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Workspace */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Team Workspace"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateWorkspace} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Workspace Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Northstar Technologies"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Purpose and scope of this team workspace..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
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
              className="px-5 py-2 rounded-lg font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-xs"
            >
              Create Workspace
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
