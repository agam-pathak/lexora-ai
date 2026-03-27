"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FileUp,
  GraduationCap,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  MessageSquareText,
  Search,
  X,
  Zap,
} from "lucide-react";
import CommandPalette from "./CommandPalette";

import type { AuthSession } from "@/lib/types";

type AppShellProps = {
  children: React.ReactNode;
  session: AuthSession | null;
  avatarUrl?: string; // Add this
};

const navLinks = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/upload", label: "Library", icon: FileUp },
  { href: "/chat", label: "Workspace", icon: MessageSquareText },
  { href: "/scholar", label: "Scholar", icon: GraduationCap },
];

export default function AppShell({ 
  children, 
  session,
  avatarUrl = "/avatars/avatar1.png" // Default just in case
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isAuthPage = pathname === "/auth";
  const isChatPage = pathname === "/chat" || pathname.startsWith("/chat/");
  const isScholarPage = pathname === "/scholar" || pathname.startsWith("/scholar/");
  const isFullHeightPage = isChatPage || isScholarPage;

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

  return (
    <div className={`flex flex-col h-screen overflow-hidden bg-slate-950 font-sans transition-colors duration-500`}>
      {/* ── UNIFIED TOP BAR ── */}
      {!isAuthPage && (
        <header className="sticky top-0 z-[60] flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] bg-slate-950/70 px-6 backdrop-blur-xl shadow-lg ring-1 ring-white/[0.02]">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 active:scale-95 transition-transform group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20 shadow-inner ring-1 ring-white/10 group-hover:ring-cyan-400/30 transition-all">
                <Image
                  src="/logo-mark.png"
                  width={24}
                  height={24}
                  alt="Lexora AI"
                  className="h-6 w-6 object-contain"
                />
              </div>
              <div className="hidden sm:block">
                 <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400/80">Lexora AI</p>
                 <p className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">Intelligence Layer</p>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                const Icon = link.icon;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all relative group ${
                      active
                        ? "text-white bg-white/[0.05]"
                        : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.02]"
                    }`}
                  >
                    {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" />}
                    <Icon className={`h-4 w-4 ${active ? "text-cyan-400" : "group-hover:text-slate-200"}`} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden lg:flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-300 hover:border-white/[0.12] transition-all group"
            >
              <Search className="h-4 w-4" />
              Quick Search...
              <div className="flex items-center gap-1 rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9px] text-slate-400 group-hover:text-slate-200">
                <span className="text-[10px]">⌘</span>K
              </div>
            </button>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                System Ready
             </div>

             {session ? (
               <div className="flex items-center gap-3 pl-4 border-l border-white/5">
                  <div className="hidden lg:flex flex-col items-end mr-1">
                     <p className="text-xs font-bold text-white leading-tight">{session.name}</p>
                     <p className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Workspace Owner</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    disabled={signingOut}
                    className="h-9 w-9 flex items-center justify-center rounded-xl border border-white/5 bg-white/5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all disabled:opacity-30"
                  >
                    {signingOut ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  </button>
                  <Link href="/profile" className="relative h-10 w-10 flex items-center justify-center rounded-xl border border-white/10 shadow-inner select-none transition hover:brightness-125 hover:shadow-cyan-500/20 overflow-hidden">
                    <Image src={avatarUrl} alt="Profile" fill className="object-cover" sizes="40px" />
                  </Link>
               </div>
             ) : (
                <div className="flex items-center gap-2">
                   <Link href="/auth?mode=signin" className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">Sign In</Link>
                   <Link href="/auth?mode=signup" className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-white transition hover:brightness-110 shadow-lg shadow-cyan-900/20">
                     Join Engine
                     <Zap className="h-3.5 w-3.5" />
                   </Link>
                 </div>
             )}

             <button
               onClick={() => setIsMobileMenuOpen(true)}
               className="flex lg:hidden h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white"
             >
               <Menu className="h-5 w-5" />
             </button>
          </div>
        </header>
      )}

      {/* ── MOBILE MENU DRAWER ── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] border-r border-white/10 bg-[#0c101d] p-6 shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between mb-10">
               <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-cyan-500/20 p-1.5 ring-1 ring-cyan-500/20">
                     <Image src="/logo-mark.png" width={20} height={20} alt="" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-white">Lexora AI</span>
               </div>
               <button onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white">
                  <X className="h-5 w-5" />
               </button>
            </div>

            <nav className="space-y-2">
              {navLinks.map((link) => {
                const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                const Icon = link.icon;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-4 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                      active
                        ? "text-cyan-400 bg-cyan-400/10 border border-cyan-400/20"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="absolute bottom-10 left-6 right-6 space-y-4">
               {session ? (
                 <button onClick={handleSignOut} className="flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-sm font-bold text-rose-400 hover:bg-rose-500/10 transition-colors">
                    <LogOut className="h-5 w-5" />
                    Sign Out
                 </button>
               ) : (
                 <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 text-sm font-bold text-white shadow-xl shadow-cyan-900/20 transition hover:brightness-110">
                   Join Engine
                   <Zap className="h-4 w-4" />
                 </Link>
               )}
            </div>
          </div>
        </div>
      )}

      {/* ── ROBUST MAIN CONTAINER ── */}
      <main className={`relative flex-1 ${isFullHeightPage ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}>
        {!isAuthPage && (
          <>
            <div className={`workspace-orb ${isScholarPage ? 'workspace-orb-left-scholar' : 'workspace-orb-left'}`} />
            <div className={`workspace-orb ${isScholarPage ? 'workspace-orb-right-scholar' : 'workspace-orb-right'}`} />
          </>
        )}
        
        {/* Children wrapper - Fix: No more height constraint for scrollable pages */}
        <div className={`relative z-10 w-full ${isFullHeightPage ? 'h-full' : 'min-h-full'}`}>
          {children}
        </div>
      </main>

      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
      />
    </div>
  );
}
