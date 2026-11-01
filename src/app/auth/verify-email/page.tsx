"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Verification token is missing.");
      setLoading(false);
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          setSuccess(data.message || "Email verified successfully!");
        } else {
          setError(data.error || "Verification failed.");
        }
      })
      .catch(() => {
        setError("Network error occurred during verification.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  return (
    <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-center">
      <div className="flex justify-center mb-4">
        <BrandLogo size="large" />
      </div>

      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
        Email Verification
      </h1>

      {loading && (
        <div className="py-8 text-xs text-slate-500">Verifying single-use token...</div>
      )}

      {error && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-brand-600 text-white font-semibold text-xs hover:bg-brand-700"
          >
            <span>Go to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {success && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5 text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 text-white font-semibold text-xs hover:bg-brand-700 shadow-sm"
          >
            <span>Continue to Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#090d16]">
      <Suspense fallback={<div className="text-sm text-slate-500">Loading...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
