"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  FileUp,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MessageSquareText,
  Settings,
  User,
} from "lucide-react";

import type { AuthSession } from "@/lib/types";

type AppShellProps = {
  children: React.ReactNode;
  session: AuthSession | null;
};

const navLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "My Docs", icon: FileUp },
  { href: "/chat", label: "Chat", icon: MessageSquareText },
  { href: "#", label: "Settings", icon: Settings },
  { href: "#", label: "Profile", icon: User },
];

const workspacePrefixes = ["/chat", "/upload"];

function isWorkspaceRoute(pathname: string) {
  return workspacePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function AppShell({ children, session }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const workspaceRoute = isWorkspaceRoute(pathname);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      router.push("/auth");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const profile = session
    ? {
        initials: session.name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((s) => s[0]?.toUpperCase() ?? "")
          .join(""),
        label: session.name,
      }
    : { initials: "G", label: "Guest" };

  if (workspaceRoute) {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        {/* ── Top navigation bar ── */}
        <header className="topbar z-40 flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[rgba(6,8,16,0.88)] px-5 backdrop-blur-xl">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="SmartDoc AI"
                className="h-7 w-7 object-contain"
              />
              <span className="text-sm font-bold tracking-tight text-white">
                SmartDoc AI
              </span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => {
                const active = pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "bg-white/[0.08] text-white"
                        : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {session && (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
              >
                {signingOut ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" />
                )}
                Sign out
              </button>
            )}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 text-[11px] font-bold text-cyan-200 ring-1 ring-white/10">
              {profile.initials}
            </div>
          </div>
        </header>

        {/* ── Main content area ── */}
        <main className="relative flex-1 overflow-hidden">
          <div className="workspace-orb workspace-orb-left" />
          <div className="workspace-orb workspace-orb-right" />
          <div className="relative z-10 h-full">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-14 pt-5 sm:px-6 lg:px-8">
      <div className="marketing-orb marketing-orb-a" />
      <div className="marketing-orb marketing-orb-b" />
      <div className="marketing-orb marketing-orb-c" />
      <div className="page-wrap relative z-10">{children}</div>
    </main>
  );
}
