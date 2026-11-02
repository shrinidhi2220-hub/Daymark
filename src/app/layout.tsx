import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthContext";
import { TimerProvider } from "@/components/TimerContext";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Daymark — Workspace & Daily Routine Manager",
  description: "Personal and team workspace for managing job applications, team tasks, courses, saved websites, and daily learning routines.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen">
        <ThemeProvider>
          <AuthProvider>
            <TimerProvider>
              <AppShell>{children}</AppShell>
            </TimerProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

