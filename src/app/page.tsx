import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { Briefcase, CheckSquare, BookOpen, Bookmark, ArrowRight, ShieldCheck, Zap } from "lucide-react";

export default function HomePage() {
  const sessionToken = cookies().get("daymark_session")?.value;
  if (sessionToken) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-[#0d131f]/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <BrandLogo size="default" />
          <div className="flex items-center gap-3">
            <Link
              href="/auth/signin"
              className="text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 shadow-sm transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-6 py-16 sm:py-24 text-center flex-1 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-semibold mb-6">
          <Zap className="w-3.5 h-3.5" />
          <span>Complete Personal & Team Workspace</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 dark:text-white max-w-3xl mb-6">
          Organize your job search, tasks, learning routines, and team projects.
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mb-8 leading-relaxed">
          Daymark brings together your job applications pipeline, shared team task boards, course curricula, and daily timed routines into one calm, private workspace.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full justify-center max-w-md">
          <Link
            href="/auth/signin"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 shadow-md transition-all"
          >
            <span>Launch Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/auth/signup"
            className="w-full sm:w-auto px-6 py-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Create New Account
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-16 text-left w-full">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 w-fit mb-3">
              <Briefcase className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold mb-1">Job Applications</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Board, list, and calendar views. Track interview rounds, notes, resumes, and follow-ups.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 w-fit mb-3">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold mb-1">Team & Personal Tasks</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kanban boards, checklist subtasks, blocker explanations, comments, and mentions.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
            <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 w-fit mb-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold mb-1">Courses & Learning</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Structured modules, lesson progress tracking, study session logger, and takeaways.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 w-fit mb-3">
              <Bookmark className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold mb-1">Saved Links & Timers</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Curate resources, run persistent daily goal timers, and track learning streaks.
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Private by default. Relational data model with server-side authorization.</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
        <p>Daymark — Built for focused professionals and engineering teams.</p>
      </footer>
    </div>
  );
}

