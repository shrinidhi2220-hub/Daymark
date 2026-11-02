import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center text-xs text-slate-500 dark:text-slate-400 mb-4" aria-label="Breadcrumb">
      <Link
        href="/dashboard"
        className="flex items-center hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <Home className="w-3.5 h-3.5 mr-1" />
        <span>Home</span>
      </Link>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight className="w-3 h-3 mx-1.5 text-slate-400 shrink-0" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors truncate"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

