"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/components/AuthContext";
import { Users, AlertCircle, CheckCircle2, Shield, ArrowRight } from "lucide-react";

export default function InvitationPage({
  params,
}: {
  params: { token: string };
}) {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadInvitation = useCallback(async () => {
    try {
      const res = await fetch(`/api/invitations/${params.token}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invitation not found.");
      } else {
        setInvitation(data.invitation);
      }
    } catch {
      setError("Failed to load invitation.");
    } finally {
      setLoading(false);
    }
  }, [params.token]);

  useEffect(() => {
    loadInvitation();
  }, [loadInvitation]);

  const handleAction = async (action: "ACCEPT" | "DECLINE") => {
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/invitations/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Action failed.");
      } else {
        setSuccessMessage(data.message);
        await refreshUser();
        if (action === "ACCEPT") {
          setTimeout(() => router.push(`/workspaces/${data.workspaceId}`), 1500);
        }
      }
    } catch {
      setError("Network error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-sm text-slate-500">Loading invitation...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#090d16]">
      <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-center">
        <div className="flex justify-center mb-4">
          <BrandLogo size="large" />
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5 text-left mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5 text-left mb-4">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {invitation && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-400 block mb-1">Workspace Invitation</span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {invitation.workspace.name}
              </h2>
              <div className="text-xs text-slate-500 mt-1">
                Invited by {invitation.invitedBy?.name || "a team administrator"}
              </div>
              <div className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-100 dark:bg-brand-900 text-brand-800 dark:text-brand-200">
                Role: {invitation.role}
              </div>
            </div>

            {/* Invalid or Non-pending states */}
            {invitation.state !== "PENDING" && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 font-medium">
                This invitation is {invitation.state.toLowerCase()}.
              </div>
            )}

            {invitation.state === "PENDING" && (
              <>
                {!user ? (
                  <div className="space-y-2 pt-2 text-xs">
                    <p className="text-slate-600 dark:text-slate-400">
                      Please sign in or create an account with <strong>{invitation.email}</strong> to accept this invitation.
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Link
                        href={`/auth/signin?returnUrl=/invite/${params.token}`}
                        className="flex-1 py-2 rounded-lg bg-brand-600 text-white font-semibold text-xs"
                      >
                        Sign In
                      </Link>
                      <Link
                        href={`/auth/signup?returnUrl=/invite/${params.token}`}
                        className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                      >
                        Sign Up
                      </Link>
                    </div>
                  </div>
                ) : user.email.toLowerCase() !== invitation.email.toLowerCase() ? (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 text-left space-y-2">
                    <div className="font-bold">Email Mismatch</div>
                    <p>
                      This invitation was sent to <strong>{invitation.email}</strong>. You are currently signed in as <strong>{user.email}</strong>.
                    </p>
                    <p className="text-[11px] text-rose-600">
                      Please sign out and log in with the invited email address to accept.
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => handleAction("DECLINE")}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleAction("ACCEPT")}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 rounded-lg bg-brand-600 text-white font-semibold text-xs hover:bg-brand-700 shadow-sm"
                    >
                      {actionLoading ? "Joining..." : "Accept & Join Workspace"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
