"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  BookOpen,
  Bookmark,
  Bell,
  Settings,
  Users,
  Search,
  Menu,
  X,
  Play,
  Pause,
  Check,
  Trash2,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  Plus,
  Shield,
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { useAuth } from "./AuthContext";
import { useTimer } from "./TimerContext";
import { useTheme } from "./ThemeProvider";
import { SearchModal } from "./SearchModal";

export function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, workspaces, selectedWorkspaceId, setSelectedWorkspaceId, unreadCount, signOut } = useAuth();
  const { activeTimer, formattedTime, isPaused, pauseTimer, resumeTimer, finishTimer, discardTimer } = useTimer();
  const { theme, toggleTheme } = useTheme();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    setWorkspaceMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Job Applications", href: "/applications", icon: Briefcase },
    { label: "Team Tasks", href: "/tasks", icon: CheckSquare },
    { label: "Courses", href: "/courses", icon: BookOpen },
    { label: "Saved Links & Goals", href: "/saved-links", icon: Bookmark },
    { label: "Workspaces", href: "/workspaces", icon: Users },
    {
      label: "Notifications",
      href: "/notifications",
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const currentWorkspaceName =
    selectedWorkspaceId === "personal"
      ? "Personal Workspace"
      : selectedWorkspaceId === "all"
      ? "All Workspaces"
      : workspaces.find((w) => w.id === selectedWorkspaceId)?.name || "Workspace";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100">
      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] shrink-0">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BrandLogo size="default" />
          </Link>

          {/* Workspace Context Switcher Dropdown */}
          <div className="relative mt-4">
            <button
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                <span className="truncate">{currentWorkspaceName}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </button>

            {workspaceMenuOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl p-1 text-xs">
                <button
                  onClick={() => {
                    setSelectedWorkspaceId("all");
                    setWorkspaceMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between ${
                    selectedWorkspaceId === "all"
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 font-semibold"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span>All Workspaces</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedWorkspaceId("personal");
                    setWorkspaceMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between ${
                    selectedWorkspaceId === "personal"
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 font-semibold"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span>Personal (Private)</span>
                </button>
                {workspaces.length > 0 && (
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                )}
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setSelectedWorkspaceId(ws.id);
                      setWorkspaceMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between ${
                      selectedWorkspaceId === ws.id
                        ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 font-semibold"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span className="truncate">{ws.name}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 ml-1">
                      {ws.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-brand-600 dark:text-brand-400" : ""}`} />
                  <span>{link.label}</span>
                </div>
                {link.badge !== undefined && (
                  <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-red-500 text-white leading-none">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Sign Out in Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <Link
              href="/settings"
              className="flex items-center gap-2.5 overflow-hidden group hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {user?.name ? user.name.slice(0, 2) : "U"}
              </div>
              <div className="truncate">
                <div className="text-xs font-medium truncate text-slate-900 dark:text-slate-100">
                  {user?.name || "User"}
                </div>
                <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
              </div>
            </Link>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                title="Toggle Light/Dark Theme"
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
              </button>
              <button
                onClick={signOut}
                title="Sign out"
                className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] flex items-center justify-between px-4 sm:px-6 shrink-0 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Quick Search trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Search records...</span>
              <kbd className="hidden sm:inline px-1 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] text-slate-400 font-mono">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Header items: Active Timer & Actions */}
          <div className="flex items-center gap-3">
            {/* Active Timer Pill Bar (Visible across whole app!) */}
            {activeTimer && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 dark:bg-brand-950/60 dark:border-brand-800 text-xs shadow-sm animate-in fade-in">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-semibold truncate max-w-[140px] sm:max-w-[200px] text-brand-950 dark:text-brand-100">
                  {activeTimer.savedLink.title}
                </span>
                <span className="font-mono font-bold text-brand-700 dark:text-brand-300">
                  {formattedTime}
                </span>
                <div className="flex items-center gap-0.5 border-l border-brand-200 dark:border-brand-800 pl-2 ml-1">
                  {isPaused ? (
                    <button
                      onClick={resumeTimer}
                      title="Resume timer"
                      className="p-1 rounded hover:bg-brand-100 dark:hover:bg-brand-900 text-emerald-600"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  ) : (
                    <button
                      onClick={pauseTimer}
                      title="Pause timer"
                      className="p-1 rounded hover:bg-brand-100 dark:hover:bg-brand-900 text-amber-600"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    </button>
                  )}
                  <button
                    onClick={finishTimer}
                    title="Finish & Save Goal Session"
                    className="p-1 rounded hover:bg-brand-100 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-300 font-bold"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={discardTimer}
                    title="Discard Session"
                    className="p-1 rounded hover:bg-brand-100 dark:hover:bg-brand-900 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Bell */}
            <Link
              href="/notifications"
              className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900"></span>
              )}
            </Link>

            {/* Quick Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Theme"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm md:hidden animate-in fade-in"
            onClick={() => setMobileOpen(false)}
          >
            <div
              className="w-4/5 max-w-xs h-full bg-white dark:bg-slate-900 p-4 flex flex-col justify-between shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                  <BrandLogo size="default" />
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Workspace Selection */}
                <div className="mt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Current Context
                  </div>
                  <select
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    value={selectedWorkspaceId}
                    onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                  >
                    <option value="all">All Workspaces</option>
                    <option value="personal">Personal (Private)</option>
                    {workspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>
                        {ws.name} ({ws.role})
                      </option>
                    ))}
                  </select>
                </div>

                <nav className="mt-4 space-y-1">
                  {navLinks.map((link) => {
                    const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                          isActive
                            ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4" />
                          <span>{link.label}</span>
                        </div>
                        {link.badge !== undefined && (
                          <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-red-500 text-white">
                            {link.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="text-xs">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{user?.name}</div>
                  <div className="text-slate-400 text-[11px]">{user?.email}</div>
                </div>
                <button
                  onClick={signOut}
                  className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content Scroll Area */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

