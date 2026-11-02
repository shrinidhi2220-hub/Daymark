"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navigation } from "./Navigation";
import { useAuth } from "./AuthContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, user } = useAuth();

  const isAuthRoute =
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/invite/") ||
    pathname === "/";

  // During auth routes, don't show the sidebar navigation
  if (isAuthRoute && !pathname.startsWith("/dashboard")) {
    return <div className="min-h-screen bg-slate-50 dark:bg-[#090d16]">{children}</div>;
  }

  return <Navigation>{children}</Navigation>;
}

