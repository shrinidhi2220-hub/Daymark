"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Shield,
  Plus,
  Mail,
  Trash2,
  Folder,
  CheckSquare,
  Clock,
  Archive,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Modal } from "@/components/Modal";
import { formatDateTimeInTimezone } from "@/lib/date-utils";

export default function WorkspaceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [workspace, setWorkspace] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("VIEWER");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite Modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Add Project Modal
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");

  const loadWorkspace = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${params.id}`);
      if (!res.ok) {
        setError("Workspace not found or access denied.");
      } else {
        const json = await res.json();
        setWorkspace(json.workspace);
        setCurrentUserRole(json.currentUserRole);
      }
    } catch {
      setError("Failed to load workspace.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/workspaces/${params.id}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update role.");
      } else {
        loadWorkspace();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveMember = async (targetUserId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this workspace?`)) return;

    try {
      const res = await fetch(`/api/workspaces/${params.id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to remove member.");
      } else {
        loadWorkspace();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setGeneratedInviteLink(null);

    try {
      const res = await fetch(`/api/workspaces/${params.id}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      const json = await res.json();
      if (!res.ok) {
        setInviteError(json.error || "Failed to send invitation.");
      } else {
        const fullInviteUrl = `${window.location.origin}${json.inviteUrl}`;
        setGeneratedInviteLink(fullInviteUrl);
        setInviteEmail("");
      }
    } catch {
      setInviteError("Network error.");
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      await fetch(`/api/workspaces/${params.id}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName.trim(), description: projectDesc.trim() || null }),
      });
      setProjectModalOpen(false);
      setProjectName("");
      setProjectDesc("");
      loadWorkspace();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!confirm(`Are you sure you want to delete "${workspace.name}"? All shared projects and tasks will be permanently removed.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/workspaces/${params.id}`, { method: "DELETE" });
      if (res.ok) {
        refreshUser();
        router.push("/workspaces");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-8 text-center text-sm text-slate-500">Loading workspace...</div>;
  if (error || !workspace) return <div className="p-8 text-center text-sm text-red-500">{error}</div>;

  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "Workspaces", href: "/workspaces" },
          { label: workspace.name },
        ]}
      />

      {/* Header */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                Your Role: {currentUserRole}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-950 dark:text-white mt-1">
              {workspace.name}
            </h1>
            {workspace.description && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
                {workspace.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canManage && (
              <button
                onClick={() => setInviteModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Invite Teammate</span>
              </button>
            )}

            {currentUserRole === "OWNER" && (
              <button
                onClick={handleDeleteWorkspace}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                title="Delete workspace"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="pt-3 text-xs text-slate-500 flex items-center gap-4">
          <span>Slug: {workspace.slug}</span>
          <span>•</span>
          <span>{workspace.members?.length || 1} Total Members</span>
          <span>•</span>
          <span>{workspace.projects?.length || 0} Projects</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members Management (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-600" />
                <span>Workspace Members</span>
              </h2>
              {canManage && (
                <button
                  onClick={() => setInviteModalOpen(true)}
                  className="text-xs text-brand-600 font-semibold hover:underline"
                >
                  + Invite by Email
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {workspace.members?.map((m: any) => (
                <div
                  key={m.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 font-bold text-xs flex items-center justify-center uppercase shrink-0">
                      {m.user.name.slice(0, 2)}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {m.user.name} {m.userId === user?.id && "(You)"}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{m.user.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canManage && m.userId !== user?.id && m.role !== "OWNER" ? (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                        className="text-xs py-1 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MEMBER">Member</option>
                        <option value="VIEWER">Viewer</option>
                        {currentUserRole === "OWNER" && <option value="OWNER">Owner</option>}
                      </select>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {m.role}
                      </span>
                    )}

                    {canManage && m.userId !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(m.userId, m.user.name)}
                        className="p-1 rounded text-slate-400 hover:text-red-500"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shared Projects List */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Folder className="w-4 h-4 text-emerald-600" />
                <span>Projects</span>
              </h2>
              {canManage && (
                <button
                  onClick={() => setProjectModalOpen(true)}
                  className="text-xs text-emerald-600 font-semibold hover:underline"
                >
                  + Add Project
                </button>
              )}
            </div>

            {workspace.projects?.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                No projects created yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {workspace.projects?.map((proj: any) => (
                  <Link
                    key={proj.id}
                    href={`/tasks?projectId=${proj.id}`}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs hover:border-brand-500 transition-colors"
                  >
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: proj.color || "#0c87eb" }}
                      />
                      <span>{proj.name}</span>
                    </div>
                    {proj.description && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {proj.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Workspace Activity Feed (1 col) */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Workspace Activity Log</span>
          </h2>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {workspace.activities?.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                No activity recorded yet.
              </div>
            ) : (
              workspace.activities?.map((act: any) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-xs space-y-0.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {act.user.name}
                    </span>
                    <span className="text-slate-400">
                      {formatDateTimeInTimezone(act.createdAt, user?.timezone)}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">{act.details}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal: Invite Teammate */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          setGeneratedInviteLink(null);
        }}
        title="Invite Teammate to Workspace"
      >
        {inviteError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {inviteError}
          </div>
        )}

        {generatedInviteLink ? (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
              <span className="font-bold block mb-1">Invitation Link Generated!</span>
              <p>
                Share this secure single-use invitation link with the recipient. They will be able to sign in or sign up and join this workspace.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-[11px] break-all flex items-center justify-between gap-2">
              <span>{generatedInviteLink}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedInviteLink);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="px-2 py-1 rounded bg-brand-600 text-white font-sans text-xs shrink-0 flex items-center gap-1"
              >
                {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLink ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setInviteModalOpen(false);
                  setGeneratedInviteLink(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Recipient Email *
              </label>
              <input
                type="email"
                required
                placeholder="colleague@domain.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="MEMBER">Member (Create and manage tasks)</option>
                <option value="ADMIN">Admin (Manage members and projects)</option>
                <option value="VIEWER">Viewer (Read-only access)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-xs"
              >
                Generate Invitation
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Add Project */}
      <Modal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        title="Add Project"
      >
        <form onSubmit={handleAddProject} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Infrastructure Migration"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Project goals and deliverables..."
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setProjectModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
            >
              Create Project
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
