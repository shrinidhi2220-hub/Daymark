/**
 * Date and timezone utilities for Daymark.
 * Timestamps are stored in UTC in the database, and converted to the user's
 * configured timezone for display and daily boundary calculations.
 */

export function formatDateInTimezone(
  date: Date | string | number | null | undefined,
  timeZone = "UTC",
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
): string {
  if (!date) return "";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      ...options,
    }).format(d);
  } catch {
    // Fallback to UTC if timezone is invalid
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      ...options,
    }).format(d);
  }
}

export function formatDateTimeInTimezone(
  date: Date | string | number | null | undefined,
  timeZone = "UTC"
): string {
  return formatDateInTimezone(date, timeZone, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Returns date formatted as YYYY-MM-DD in the given timezone.
 */
export function getDateStringInTimezone(
  date: Date = new Date(),
  timeZone = "UTC"
): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date); // Outputs YYYY-MM-DD
  } catch {
    return date.toISOString().split("T")[0];
  }
}

/**
 * Calculates current streak and maximum streak given a list of completion date strings (YYYY-MM-DD)
 * and the user's current date string in their timezone.
 */
export function calculateStreak(
  completedDateStrings: string[],
  todayDateString: string
): { currentStreak: number; bestStreak: number } {
  if (!completedDateStrings || completedDateStrings.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Deduplicate and sort descending
  const uniqueDates = Array.from(new Set(completedDateStrings)).sort().reverse();
  const dateSet = new Set(uniqueDates);

  // Check if today or yesterday was completed
  const today = new Date(todayDateString + "T00:00:00Z");
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let currentStreak = 0;
  let checkDate = dateSet.has(todayDateString)
    ? today
    : dateSet.has(yesterdayStr)
    ? yesterday
    : null;

  if (checkDate) {
    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (dateSet.has(dateStr)) {
        currentStreak++;
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }
  }

  // Calculate best streak historically
  let bestStreak = 0;
  let runningStreak = 0;
  const chronological = Array.from(dateSet).sort();

  for (let i = 0; i < chronological.length; i++) {
    if (i === 0) {
      runningStreak = 1;
    } else {
      const prev = new Date(chronological[i - 1] + "T00:00:00Z");
      const curr = new Date(chronological[i] + "T00:00:00Z");
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays === 1) {
        runningStreak++;
      } else {
        runningStreak = 1;
      }
    }
    if (runningStreak > bestStreak) {
      bestStreak = runningStreak;
    }
  }

  return { currentStreak, bestStreak };
}

/**
 * Formats duration in seconds to a human-readable mm:ss or hh:mm:ss.
 */
export function formatDuration(seconds: number): string {
  const safeSec = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safeSec / 3600);
  const mins = Math.floor((safeSec % 3600) / 60);
  const secs = safeSec % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

