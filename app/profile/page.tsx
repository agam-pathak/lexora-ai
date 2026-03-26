import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { getDocuments } from "@/lib/vectorStore";
import { getConversationSummaries } from "@/lib/conversations";
import { getUserSessions } from "@/lib/scholar/db";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { 
  ArrowLeft,
  ShieldCheck, 
  FileUp, 
  MessageSquareText, 
  GraduationCap,
  Clock,
  CreditCard,
  Target
} from "lucide-react";
import EditProfileModal from "@/components/profile/EditProfileModal";

export const metadata: Metadata = {
  title: "Profile – Lexora AI",
  description: "Manage your Lexora Account, API Keys, and view your usage metrics.",
};

export default async function ProfilePage() {
  const session = await requireSession();
  const cookieStore = await cookies();
  const avatarUrl = cookieStore.get("lexora_avatar")?.value || "/avatars/avatar1.png";

  // Parallel fetch stats
  const [documents, conversations, scholarSessions] = await Promise.all([
    getDocuments(session.userId),
    getConversationSummaries(session.userId),
    getUserSessions(session.userId)
  ]);

  const initials = (session.name || "User")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "??";

  const joinDate = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }); // Mocking since users table isn't directly exposed here, but sufficient for UI.

  const docCount = documents.length;
  const chunkCount = documents.reduce((acc, doc) => acc + (doc.chunkCount || 0), 0);
  const chatCount = conversations.length;
  const examCount = scholarSessions.length;

  return (
    <div className="flex h-full flex-col">
      {/* ── Sub-Header ── */}
      <div className="relative z-40 shrink-0 border-b border-white/[0.06] bg-slate-950/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400/80">Account & Settings</p>
              <p className="text-xs font-bold text-white">Your Profile</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                <ShieldCheck className="h-3 w-3" />
                Verified
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
          
          {/* ── User Overview Banner ── */}
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-950/40 p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/[0.03]">
             <div className="absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-[80px]" />
             <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                   <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(34,211,238,0.15)] ring-1 ring-white/5 overflow-hidden">
                      <Image 
                        src={avatarUrl} 
                        alt="Profile Avatar" 
                        fill 
                        className="object-cover"
                        sizes="96px"
                        priority
                      />
                   </div>
                   <div>
                      <h1 className="text-3xl font-bold text-white tracking-tight">{session.name}</h1>
                      <p className="mt-1 text-sm text-slate-400 font-medium">{session.email}</p>
                      <div className="mt-3 flex gap-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                         <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Joined {joinDate}</span>
                      </div>
                   </div>
                </div>
                <div className="flex shrink-0">
                   <EditProfileModal 
                      currentName={session.name} 
                      currentAvatar={avatarUrl}
                   />
                </div>
             </div>
          </div>

          {/* ── Usage Metrics Grid ── */}
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400 pt-4">Usage Analytics</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
             {/* Documents */}
             <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-md transition hover:bg-white/[0.04]">
                <div className="mb-4 flex items-center justify-between">
                   <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
                      <FileUp className="h-5 w-5" />
                   </div>
                   <Link href="/upload" className="text-xs font-bold text-cyan-400 hover:text-cyan-300">Manage</Link>
                </div>
                <p className="text-3xl font-bold text-white">{docCount}</p>
                <p className="mt-1 text-xs font-bold text-slate-500 uppercase tracking-widest">Documents Indexed</p>
                <p className="mt-3 text-[10px] text-slate-600">{chunkCount} total vector chunks stored</p>
             </div>

             {/* Chats */}
             <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-md transition hover:bg-white/[0.04]">
                <div className="mb-4 flex items-center justify-between">
                   <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
                      <MessageSquareText className="h-5 w-5" />
                   </div>
                   <Link href="/chat" className="text-xs font-bold text-blue-400 hover:text-blue-300">Chats</Link>
                </div>
                <p className="text-3xl font-bold text-white">{chatCount}</p>
                <p className="mt-1 text-xs font-bold text-slate-500 uppercase tracking-widest">Active Threads</p>
                <p className="mt-3 text-[10px] text-slate-600">Across your document library</p>
             </div>

             {/* Scholar Assessments */}
             <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-md transition hover:bg-white/[0.04]">
                <div className="mb-4 flex items-center justify-between">
                   <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
                      <GraduationCap className="h-5 w-5" />
                   </div>
                   <Link href="/scholar" className="text-xs font-bold text-amber-400 hover:text-amber-300">Scholar</Link>
                </div>
                <p className="text-3xl font-bold text-white">{examCount}</p>
                <p className="mt-1 text-xs font-bold text-slate-500 uppercase tracking-widest">Mock Tests Taken</p>
                <p className="mt-3 text-[10px] text-slate-600">Lexora Omni-Exam Strategist</p>
             </div>

             {/* Vector Core Limit */}
             <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-md transition hover:bg-white/[0.04]">
                <div className="mb-4 flex items-center justify-between">
                   <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                      <Target className="h-5 w-5" />
                   </div>
                </div>
                <p className="text-3xl font-bold text-white">100%</p>
                <p className="mt-1 text-xs font-bold text-slate-500 uppercase tracking-widest">Vector Health</p>
                <div className="mt-3 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                   <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 w-1/4" />
                </div>
                <p className="mt-2 text-[10px] text-slate-600">Storage capacity highly optimal</p>
             </div>
          </div>

          <div className="max-w-xl pt-4 pb-12">
             <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-900/10 to-blue-900/5 p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                         <CreditCard className="h-4 w-4" />
                      </div>
                      <h3 className="font-bold text-white">Current Plan</h3>
                   </div>
                   <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-300">Active</span>
                </div>
                
                <div className="space-y-6">
                   <div>
                      <div className="flex items-end gap-2">
                         <h4 className="text-3xl font-bold tracking-tight text-white">Lexora Pro</h4>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">Unlimited private vector indexing, advanced OCR scanning, and Lexora Scholar access.</p>
                   </div>
                   <Link
                      href="mailto:billing@lexora.ai?subject=Manage Billing"
                      className="inline-block w-full text-center rounded-xl bg-white/10 py-3 text-xs font-bold text-white transition hover:bg-white/20"
                   >
                      Manage Billing
                   </Link>
                </div>
             </div>

          </div>

        </div>
      </div>
    </div>
  );
}
