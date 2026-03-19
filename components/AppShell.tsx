"use client";

import { usePathname } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import type { AuthSession } from "@/lib/types";

type AppShellProps = {
  children: React.ReactNode;
  session: AuthSession | null;
};

const workspacePrefixes = ["/chat", "/upload"];

function isWorkspaceRoute(pathname: string) {
  return workspacePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function AppShell({ children, session }: AppShellProps) {
  const pathname = usePathname();
  const workspaceRoute = isWorkspaceRoute(pathname);

  if (workspaceRoute) {
    return (
      <div className="workspace-shell">
        <div className="workspace-orb workspace-orb-left" />
        <div className="workspace-orb workspace-orb-right" />
        <Sidebar session={session} />
        <main className="workspace-main">
          <div className="page-wrap">{children}</div>
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
