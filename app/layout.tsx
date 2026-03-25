import { Inter } from "next/font/google";
import type { Metadata } from "next";

import AppShell from "@/components/AppShell";
import ErrorBoundary from "@/components/ErrorBoundary";
import { getSession } from "@/lib/auth";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PostHogProvider } from "@/components/PostHogProvider";

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

  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <PostHogProvider>
          <ErrorBoundary>
            <AppShell session={session}>{children}</AppShell>
          </ErrorBoundary>
          <Analytics />
          <SpeedInsights />
        </PostHogProvider>
      </body>
    </html>
  );
}

