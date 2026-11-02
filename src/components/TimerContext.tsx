"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { formatDuration } from "@/lib/date-utils";

export interface ActiveTimerData {
  id: string;
  savedLinkId: string;
  savedLink: {
    id: string;
    title: string;
    url: string;
    category: string;
  };
  isPaused: boolean;
  startedAt: string;
  targetSeconds: number;
  elapsedSeconds: number;
  progressPercent: number;
}

interface TimerContextType {
  activeTimer: ActiveTimerData | null;
  displaySeconds: number;
  formattedTime: string;
  isPaused: boolean;
  startTimer: (savedLinkId: string) => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  finishTimer: () => Promise<void>;
  discardTimer: () => Promise<void>;
  refreshTimer: () => Promise<void>;
}

const TimerContext = createContext<TimerContextType>({
  activeTimer: null,
  displaySeconds: 0,
  formattedTime: "00:00",
  isPaused: false,
  startTimer: async () => {},
  pauseTimer: async () => {},
  resumeTimer: async () => {},
  finishTimer: async () => {},
  discardTimer: async () => {},
  refreshTimer: async () => {},
});

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimerData | null>(null);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const refreshTimer = useCallback(async () => {
    try {
      const res = await fetch("/api/timer");
      if (res.ok) {
        const data = await res.json();
        setActiveTimer(data.activeTimer);
        if (data.activeTimer) {
          setDisplaySeconds(data.activeTimer.elapsedSeconds);
        } else {
          setDisplaySeconds(0);
        }
      }
    } catch {
      // ignore network errors
    }
  }, []);

  // Sync timer on initial load and when tab gains focus
  useEffect(() => {
    refreshTimer();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshTimer();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshTimer]);

  // Derived timestamp ticker: tick every second using actual Date.now() difference
  useEffect(() => {
    if (!activeTimer || activeTimer.isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const baseAccumulated = activeTimer.elapsedSeconds;
    const startTimestamp = Date.now();

    timerRef.current = setInterval(() => {
      const elapsedSinceSync = Math.floor((Date.now() - startTimestamp) / 1000);
      setDisplaySeconds(baseAccumulated + Math.max(0, elapsedSinceSync));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTimer]);

  const startTimer = async (savedLinkId: string) => {
    const res = await fetch("/api/timer/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "START", savedLinkId }),
    });
    if (res.ok) {
      await refreshTimer();
    }
  };

  const pauseTimer = async () => {
    const res = await fetch("/api/timer/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "PAUSE" }),
    });
    if (res.ok) {
      await refreshTimer();
    }
  };

  const resumeTimer = async () => {
    const res = await fetch("/api/timer/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "RESUME" }),
    });
    if (res.ok) {
      await refreshTimer();
    }
  };

  const finishTimer = async () => {
    const res = await fetch("/api/timer/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "FINISH" }),
    });
    if (res.ok) {
      setActiveTimer(null);
      setDisplaySeconds(0);
      await refreshTimer();
    }
  };

  const discardTimer = async () => {
    const res = await fetch("/api/timer/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "DISCARD" }),
    });
    if (res.ok) {
      setActiveTimer(null);
      setDisplaySeconds(0);
    }
  };

  return (
    <TimerContext.Provider
      value={{
        activeTimer,
        displaySeconds,
        formattedTime: formatDuration(displaySeconds),
        isPaused: Boolean(activeTimer?.isPaused),
        startTimer,
        pauseTimer,
        resumeTimer,
        finishTimer,
        discardTimer,
        refreshTimer,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  return useContext(TimerContext);
}

