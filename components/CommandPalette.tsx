"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  FileText, 
  MessageSquare, 
  User, 
  FileUp, 
  GraduationCap, 
  Command,
  History,
  Zap,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

import type { IndexedDocument, ConversationSummary } from "@/lib/types";
import { Skeleton } from "./ui/Skeleton";

type CommandPaletteProps = {
  isOpen: boolean;
  onClose: () => void;
};

type SearchResult = {
  id: string;
  title: string;
  type: "document" | "thread" | "page" | "action";
  href: string;
  icon: LucideIcon;
  meta?: string;
};

const STATIC_ITEMS: SearchResult[] = [
  { id: "nav-home", title: "Go to Home", type: "page", href: "/", icon: Zap },
  {
    id: "nav-upload",
    title: "Library / Upload",
    type: "page",
    href: "/upload",
    icon: FileUp,
  },
  {
    id: "nav-chat",
    title: "AI Workspace",
    type: "page",
    href: "/chat",
    icon: MessageSquare,
  },
  {
    id: "nav-scholar",
    title: "Lexora Scholar",
    type: "page",
    href: "/scholar",
    icon: GraduationCap,
  },
  {
    id: "nav-profile",
    title: "My Profile",
    type: "page",
    href: "/profile",
    icon: User,
  },
];

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [threads, setThreads] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const refreshPaletteData = useEffectEvent(async () => {
    setLoading(true);
    try {
      const [fileResponse, threadResponse] = await Promise.all([
        fetch("/api/files"),
        fetch("/api/conversations"),
      ]);
      const [fileData, threadData] = await Promise.all([
        fileResponse.json(),
        threadResponse.json(),
      ]);

      if (!fileResponse.ok) {
        throw new Error(fileData.error || "Failed to load files.");
      }

      if (!threadResponse.ok) {
        throw new Error(threadData.error || "Failed to load conversations.");
      }

      setDocuments(fileData.files || []);
      setThreads(threadData.summaries || []);
    } catch (error) {
      console.error("Failed to fetch command palette data", error);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void refreshPaletteData();
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setQuery("");
    setActiveIndex(0);
    onClose();
  }, [onClose]);

  const handleQueryChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
      setActiveIndex(0);
    },
    [],
  );

  const filteredResults = useMemo(() => {
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase().trim();

    // 1. Match Pages
    STATIC_ITEMS.forEach(item => {
      if (item.title.toLowerCase().includes(lowerQuery)) {
        results.push(item);
      }
    });

    // 2. Match Documents
    documents.forEach(doc => {
      if (doc.name.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: doc.id,
          title: doc.name,
          type: "document",
          href: `/chat?doc=${doc.id}`,
          icon: FileText,
          meta: `${doc.pageCount} pages • ${new Date(doc.indexedAt).toLocaleDateString()}`
        });
      }
    });

    // 3. Match Threads
    threads.forEach(thread => {
      if (thread.title.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: thread.id,
          title: thread.title,
          type: "thread",
          href: `/chat?conversation=${thread.id}${thread.documentId ? `&doc=${thread.documentId}` : ""}`,
          icon: History,
          meta: `Thread • Last active: ${new Date(thread.updatedAt).toLocaleDateString()}`
        });
      }
    });

    return results;
  }, [query, documents, threads]);

  const handleSelect = useCallback((item: SearchResult) => {
    handleClose();
    router.push(item.href);
  }, [handleClose, router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClose();
      return;
    }

    if (filteredResults.length === 0) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % filteredResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + filteredResults.length) % filteredResults.length);
    } else if (e.key === "Enter" && filteredResults[activeIndex]) {
      handleSelect(filteredResults[activeIndex]);
    }
  }, [activeIndex, filteredResults, handleClose, handleSelect]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 backdrop-blur-md bg-slate-950/60 animate-in fade-in duration-200" onClick={handleClose}>
      <div 
        className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0c101d] shadow-[0_32px_128px_rgba(0,0,0,0.8)] ring-1 ring-white/5 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="relative flex items-center px-6 py-5 border-b border-white/[0.06]">
          <Search className="h-5 w-5 text-slate-500 mr-4" />
          <input
            autoFocus
            value={query}
            onChange={handleQueryChange}
            placeholder="Search documents, threads, and navigations..."
            className="flex-1 bg-transparent text-lg text-white outline-none placeholder:text-slate-600"
          />
          <kbd className="hidden sm:flex h-6 items-center gap-1 rounded bg-white/[0.06] px-2 font-mono text-[10px] font-bold text-slate-400">
            <span>ESC</span>
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto overflow-x-hidden p-2 custom-scrollbar">
          {loading && (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredResults.length === 0 && (
            <div className="py-20 text-center">
              <Command className="mx-auto h-10 w-10 text-slate-700 mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest text-slate-500">No matching search results</p>
              <p className="mt-2 text-xs text-slate-600">Try searching for document names or thread titles.</p>
            </div>
          )}

          {!loading && filteredResults.length > 0 && (
            <div className="p-2 space-y-1">
              {filteredResults.map((item, index) => {
                const Icon = item.icon;
                const active = index === activeIndex;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition-all ${
                      active 
                        ? "bg-cyan-500/10 border border-cyan-400/20 ring-1 ring-cyan-400/10" 
                        : "border border-transparent text-slate-400 hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                      active ? "border-cyan-400/20 bg-cyan-400/20 text-cyan-300" : "border-white/[0.08] bg-white/[0.05] text-slate-500"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${active ? "text-white" : "text-slate-300"}`}>
                        {item.title}
                      </p>
                      {item.meta && (
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${active ? "text-cyan-400/70" : "text-slate-600"}`}>
                          {item.meta}
                        </p>
                      )}
                    </div>
                    {active && <ArrowRight className="h-4 w-4 text-cyan-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-slate-900/40 p-3 px-6 border-t border-white/[0.06] flex items-center gap-6">
           <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-white/10 text-[8px] text-white">↵</span>
              Confirm
           </div>
           <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-white/10 text-[8px] text-white">↑↓</span>
              Navigate
           </div>
           <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-white/10 text-[8px] text-white">ESC</span>
              Close
           </div>
        </div>
      </div>
    </div>
  );
}
