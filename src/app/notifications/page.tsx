"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle,
  Check,
  X,
  ExternalLink,
  ShieldAlert,
  Info,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { EmptyState } from "@/components/EmptyState";
import { formatDateTimeInTimezone } from "@/lib/date-utils";

export default function NotificationsPage() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"NOTIFICATIONS" | "REMINDERS">("NOTIFICATIONS");

  const [notifications, setNotifications] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Browser notification opt-in status
  const [browserPermission, setBrowserPermission] = useState<string>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [notifsRes, remsRes] = await Promise.all([
        fetch("/api/notifications"),
        fetch("/api/reminders"),
      ]);

      if (notifsRes.ok) {
        const json = await notifsRes.json();
        setNotifications(json.notifications || []);
      }

      if (remsRes.ok) {
        const json = await remsRes.json();
        setReminders(json.reminders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      loadData();
      refreshUser();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      loadData();
      refreshUser();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReminderAction = async (reminderId: string, action: "COMPLETE" | "DISMISS" | "SNOOZE", snoozeHours = 1) => {
    try {
      await fetch(`/api/reminders/${reminderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, snoozeHours }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const requestBrowserPermission = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications.");
      return;
    }

    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);

    if (permission === "granted") {
      new Notification("Daymark Notifications Active", {
        body: "You will receive desktop alerts while Daymark is open in your browser tab.",
      });
      // Update user preference in database
      await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ browserNotificationsEnabled: true }),
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-brand-600" />
            <span>Notification & Reminders Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Review workspace updates, task mentions, interview alerts, and snooze or complete reminders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "NOTIFICATIONS" && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
            >
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Browser Notification Opt-In Banner with limitation disclosure */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              Desktop Notifications ({browserPermission === "granted" ? "Enabled" : "Disabled"})
            </div>
            <div className="text-slate-500 mt-0.5 max-w-xl">
              Browser alerts require an active tab or device connectivity. Full in-app alerts are always recorded in your notification center below.
            </div>
          </div>
        </div>

        {browserPermission !== "granted" ? (
          <button
            onClick={requestBrowserPermission}
            className="px-3 py-1.5 rounded-lg bg-brand-600 text-white font-semibold text-xs hover:bg-brand-700 shrink-0 shadow-xs"
          >
            Enable Desktop Alerts
          </button>
        ) : (
          <span className="text-emerald-600 font-semibold text-xs shrink-0 flex items-center gap-1">
            <Check className="w-4 h-4" /> Allowed
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("NOTIFICATIONS")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            activeTab === "NOTIFICATIONS"
              ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          Notifications ({notifications.filter((n) => !n.isRead).length} unread)
        </button>
        <button
          onClick={() => setActiveTab("REMINDERS")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            activeTab === "REMINDERS"
              ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          Active Reminders ({reminders.length})
        </button>
      </div>

      {/* Tab 1: Notifications */}
      {activeTab === "NOTIFICATIONS" && (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="All caught up!"
              description="No notifications right now. Activity and mentions will appear here."
            />
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-xl border transition-colors flex items-start justify-between gap-4 text-xs ${
                  !n.isRead
                    ? "bg-brand-50/40 border-brand-200 dark:bg-brand-950/20 dark:border-brand-900"
                    : "bg-white border-slate-200 dark:bg-[#0d131f] dark:border-slate-800"
                }`}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{n.title}</span>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0"></span>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">{n.message}</p>
                  <div className="text-[11px] text-slate-400">
                    {formatDateTimeInTimezone(n.createdAt, user?.timezone)}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {n.linkUrl && (
                    <Link
                      href={n.linkUrl}
                      onClick={() => handleMarkNotificationRead(n.id)}
                      className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-semibold text-slate-700 dark:text-slate-200"
                    >
                      View
                    </Link>
                  )}
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkNotificationRead(n.id)}
                      className="p-1 rounded text-slate-400 hover:text-slate-600"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Reminders */}
      {activeTab === "REMINDERS" && (
        <div className="space-y-3">
          {reminders.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No active reminders"
              description="Reminders for interviews, tasks, and follow-ups will appear here."
            />
          ) : (
            reminders.map((rem) => (
              <div
                key={rem.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>{rem.title}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {rem.targetType}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Scheduled: {formatDateTimeInTimezone(rem.remindAt, user?.timezone)} (
                    {rem.frequency})
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleReminderAction(rem.id, "SNOOZE", 1)}
                    className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 font-medium"
                    title="Snooze for 1 hour"
                  >
                    Snooze 1h
                  </button>
                  <button
                    onClick={() => handleReminderAction(rem.id, "COMPLETE")}
                    className="px-3 py-1 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => handleReminderAction(rem.id, "DISMISS")}
                    className="p-1 rounded text-slate-400 hover:text-red-500"
                    title="Dismiss reminder"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
