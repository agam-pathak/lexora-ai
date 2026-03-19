import { Inter } from "next/font/google";
import type { Metadata } from "next";

import AppShell from "@/components/AppShell";
import ErrorBoundary from "@/components/ErrorBoundary";
import { getSession } from "@/lib/auth";

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
        <ErrorBoundary>
          <AppShell session={session}>{children}</AppShell>
        </ErrorBoundary>
      </body>
    </html>
  );
}

