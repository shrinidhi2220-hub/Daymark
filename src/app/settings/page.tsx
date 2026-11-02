"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  User,
  Lock,
  Download,
  Trash2,
  Bell,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { validatePassword } from "@/lib/validations";

export default function SettingsPage() {
  const { user, refreshUser, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<"PROFILE" | "SECURITY" | "EXPORT" | "DANGER">("PROFILE");

  // Profile Form state
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [timezone, setTimezone] = useState(user?.timezone || "UTC");
  const [quietStart, setQuietStart] = useState(user?.quietHoursStart || "22:00");
  const [quietEnd, setQuietEnd] = useState(user?.quietHoursEnd || "08:00");
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [pwdMsg, setPwdMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Delete Account Form state
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setTimezone(user.timezone);
      setQuietStart(user.quietHoursStart);
      setQuietEnd(user.quietHoursEnd);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          timezone,
          quietHoursStart: quietStart,
          quietHoursEnd: quietEnd,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProfileMsg({ text: data.error || "Failed to update profile", type: "error" });
      } else {
        setProfileMsg({ text: "Profile updated successfully.", type: "success" });
        refreshUser();
      }
    } catch {
      setProfileMsg({ text: "A network error occurred.", type: "error" });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (newPassword !== newPasswordConfirm) {
      setPwdMsg({ text: "New passwords do not match.", type: "error" });
      return;
    }

    const val = validatePassword(newPassword);
    if (!val.isValid) {
      setPwdMsg({ text: val.errors[0], type: "error" });
      return;
    }

    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          newPasswordConfirm,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPwdMsg({ text: data.error || "Failed to change password", type: "error" });
      } else {
        setPwdMsg({ text: data.message, type: "success" });
        setCurrentPassword("");
        setNewPassword("");
        setNewPasswordConfirm("");
      }
    } catch {
      setPwdMsg({ text: "A network error occurred.", type: "error" });
    }
  };

  const handleDownloadExport = async () => {
    window.location.href = "/api/auth/export";
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteMsg(null);

    if (deleteConfirmText !== "DELETE") {
      setDeleteMsg("Please type 'DELETE' to confirm.");
      return;
    }

    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmationText: deleteConfirmText,
          password: deletePassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDeleteMsg(data.error || "Failed to delete account.");
      } else {
        alert("Account deleted.");
        signOut();
      }
    } catch {
      setDeleteMsg("A network error occurred.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          <span>Account & Preferences</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your personal details, quiet hours, security credentials, and data export.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab("PROFILE")}
          className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
            activeTab === "PROFILE"
              ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Profile & Timezone</span>
        </button>

        <button
          onClick={() => setActiveTab("SECURITY")}
          className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
            activeTab === "SECURITY"
              ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Security & Password</span>
        </button>

        <button
          onClick={() => setActiveTab("EXPORT")}
          className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
            activeTab === "EXPORT"
              ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Data Export</span>
        </button>

        <button
          onClick={() => setActiveTab("DANGER")}
          className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
            activeTab === "DANGER"
              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Danger Zone</span>
        </button>
      </div>

      {/* Tab 1: Profile */}
      {activeTab === "PROFILE" && (
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Personal Profile & Schedule
          </h2>

          {profileMsg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                profileMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {profileMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="UTC">UTC (Universal Coordinated Time)</option>
                <option value="America/New_York">America/New_York (Eastern Time)</option>
                <option value="America/Chicago">America/Chicago (Central Time)</option>
                <option value="America/Denver">America/Denver (Mountain Time)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (Pacific Time)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Europe/Berlin">Europe/Berlin (CET/CEST)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quiet Hours Start (No alerts)
                </label>
                <input
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quiet Hours End
                </label>
                <input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="px-5 py-2 rounded-lg font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-xs"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Security */}
      {activeTab === "SECURITY" && (
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Change Account Password
          </h2>

          <p className="text-xs text-slate-500">
            Updating your password immediately revokes all other active sessions across devices for security.
          </p>

          {pwdMsg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                pwdMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {pwdMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{pwdMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs max-w-md">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Current Password *
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Password *
              </label>
              <input
                type="password"
                required
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                placeholder="Repeat new password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="px-5 py-2 rounded-lg font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-xs"
              >
                Update Password
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Data Export */}
      {activeTab === "EXPORT" && (
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Download className="w-4 h-4 text-brand-600" />
            <span>Export Personal Workspace Data</span>
          </h2>

          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
            Download a complete, machine-readable JSON archive of all your personal records: job applications, interview histories, courses, syllabus lessons, study sessions, saved link goals, personal tasks, reminders, and notifications.
          </p>

          <div className="pt-2">
            <button
              onClick={handleDownloadExport}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold bg-brand-600 text-white text-xs hover:bg-brand-700 shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download JSON Export</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Danger Zone */}
      {activeTab === "DANGER" && (
        <div className="p-6 rounded-2xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-[#0d131f] shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-rose-600">
            <ShieldAlert className="w-5 h-5" />
            <h2 className="text-sm font-bold">Delete Account & Personal Data</h2>
          </div>

          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-800 dark:text-rose-200 space-y-2">
            <p className="font-semibold">Warning: This action is permanent and cannot be undone.</p>
            <p>
              Deleting your account will immediately erase all your personal job applications, interview logs, personal courses, saved links, daily streaks, reminders, and notifications.
            </p>
            <p>
              If you are the sole owner of a shared team workspace with other members, you must transfer ownership or delete that workspace before your account can be removed.
            </p>
          </div>

          {deleteMsg && (
            <div className="p-3 rounded-lg bg-red-100 border border-red-300 text-xs text-red-900 font-semibold">
              {deleteMsg}
            </div>
          )}

          <form onSubmit={handleDeleteAccount} className="space-y-4 text-xs max-w-md">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Type "DELETE" to confirm
              </label>
              <input
                type="text"
                required
                placeholder="DELETE"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Enter your password to verify
              </label>
              <input
                type="password"
                required
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg font-semibold bg-rose-600 text-white text-xs hover:bg-rose-700 shadow-xs"
              >
                Permanently Delete My Account
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

