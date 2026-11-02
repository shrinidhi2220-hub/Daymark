import React from "react";
import Link from "next/navigation";

export function BrandLogo({
  size = "default",
  showText = true,
}: {
  size?: "small" | "default" | "large";
  showText?: boolean;
}) {
  const iconSizes = {
    small: "w-6 h-6",
    default: "w-8 h-8",
    large: "w-10 h-10",
  };

  const textSizes = {
    small: "text-lg",
    default: "text-xl",
    large: "text-2xl font-bold",
  };

  return (
    <div className="flex items-center gap-2.5 select-none font-semibold">
      {/* Original Daymark Geometric Icon */}
      <div
        className={`relative flex items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-sm ring-1 ring-black/5 dark:from-brand-500 dark:to-brand-700 ${iconSizes[size]}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4/5 h-4/5 text-white"
        >
          {/* Compass / Horizon Daymark emblem */}
          <circle cx="12" cy="12" r="9" className="opacity-40" />
          <path d="M12 3v4" />
          <path d="M12 17v4" />
          <path d="M3 12h4" />
          <path d="M17 12h4" />
          <path d="m14 10-4 4" className="stroke-white" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      </div>
      {showText && (
        <span
          className={`tracking-tight font-bold text-slate-900 dark:text-slate-100 ${textSizes[size]}`}
        >
          Daymark
        </span>
      )}
    </div>
  );
}

