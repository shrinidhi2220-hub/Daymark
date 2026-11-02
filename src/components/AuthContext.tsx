"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface UserWorkspace {
  id: string;
  name: string;
  slug: string;
  role: string;
  isArchived: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  timezone: string;
  isEmailVerified: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  browserNotificationsEnabled: boolean;
  dashboardCardOrder: string;
  createdAt: string;
}

interface AuthContextType {
  user: UserProfile | null;
  workspaces: UserWorkspace[];
  selectedWorkspaceId: string; // "all", "personal", or workspace.id
  setSelectedWorkspaceId: (id: string) => void;
  unreadCount: number;
  loading: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  workspaces: [],
  selectedWorkspaceId: "all",
  setSelectedWorkspaceId: () => {},
  unreadCount: 0,
  loading: true,
  refreshUser: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceIdState] = useState<string>("all");
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setWorkspaces(data.workspaces || []);
        setUnreadCount(data.unreadNotificationCount || 0);
      } else {
        setUser(null);
        setWorkspaces([]);
      }
    } catch {
      setUser(null);
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
    const savedWs = localStorage.getItem("daymark_selected_workspace");
    if (savedWs) setSelectedWorkspaceIdState(savedWs);
  }, [refreshUser]);

  const setSelectedWorkspaceId = (id: string) => {
    setSelectedWorkspaceIdState(id);
    localStorage.setItem("daymark_selected_workspace", id);
  };

  const signOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } finally {
      setUser(null);
      setWorkspaces([]);
      router.push("/auth/signin");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaces,
        selectedWorkspaceId,
        setSelectedWorkspaceId,
        unreadCount,
        loading,
        refreshUser,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

