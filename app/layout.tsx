import { Inter } from "next/font/google";
import type { Metadata } from "next";

import AppShell from "@/components/AppShell";
import ErrorBoundary from "@/components/ErrorBoundary";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PostHogProvider } from "@/components/PostHogProvider";
import { ToastProvider } from "@/components/ui/Toast";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "Lexora AI",
    template: "%s | Lexora AI",
  },
  description:
    "A premium document intelligence workspace for grounded PDF retrieval, indexing, and chat.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const cookieStore = await cookies();
  const avatarUrl = cookieStore.get("lexora_avatar")?.value || "/avatars/avatar1.png";

  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <PostHogProvider>
          <ToastProvider>
            <ErrorBoundary>
              <AppShell session={session} avatarUrl={avatarUrl}>{children}</AppShell>
            </ErrorBoundary>
          </ToastProvider>
          <Analytics />
          <SpeedInsights />
        </PostHogProvider>
      </body>
    </html>
  );
}

