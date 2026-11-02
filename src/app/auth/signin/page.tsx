"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/components/AuthContext";
import { sanitizeRedirectPath } from "@/lib/validations";
import { ArrowRight, Lock, Mail, AlertCircle, CheckCircle2 } from "lucide-react";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = sanitizeRedirectPath(searchParams.get("returnUrl"));

  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to sign in. Please verify your credentials.");
      } else {
        await refreshUser();
        router.push(returnUrl);
      }
    } catch {
      setError("A network error occurred. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail("demo@daymark.app");
    setPassword("Daymark2026!");
    setError(null);
  };

  return (
    <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <BrandLogo size="large" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Welcome Back</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Sign in to access your personal workspace and team projects.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Demo Credentials Quick-Fill Pill */}
      <div className="mb-5 p-3 rounded-lg bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 flex items-center justify-between text-xs">
        <div>
          <div className="font-semibold text-brand-900 dark:text-brand-200">Exploring the app?</div>
          <div className="text-[11px] text-brand-700 dark:text-brand-300">
            Use the seeded demo account with realistic data.
          </div>
        </div>
        <button
          type="button"
          onClick={handleFillDemo}
          className="px-2.5 py-1.5 rounded font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors shrink-0"
        >
          Fill Demo
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="email"
              required
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 disabled:opacity-50 shadow-sm transition-all"
        >
          {loading ? "Signing in..." : "Sign In"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        Don't have an account?{" "}
        <Link
          href="/auth/signup"
          className="font-semibold text-brand-600 dark:text-brand-400 hover:underline"
        >
          Create one now
        </Link>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#090d16]">
      <Suspense fallback={<div className="text-sm text-slate-500">Loading sign in...</div>}>
        <SignInForm />
      </Suspense>
    </div>
  );
}

