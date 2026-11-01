import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-[#090d16] text-center">
      <div className="mb-6">
        <BrandLogo size="large" />
      </div>

      <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-600 flex items-center justify-center mx-auto mb-4">
        <Compass className="w-8 h-8" />
      </div>

      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">
        Page Not Found (404)
      </h1>

      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
        The link you followed may be broken or the record may have been archived or removed from your workspace.
      </p>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 text-white font-semibold text-xs hover:bg-brand-700 shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
