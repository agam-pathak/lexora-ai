import {
  ArrowRight,
  BookOpenText,
  LayoutPanelTop,
  LockKeyhole,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { getSession } from "@/lib/auth";

const productSignals = [
  {
    title: "Evidence-first answers",
    description:
      "Each answer is built from retrieved chunks instead of a blind full-document prompt.",
    icon: SearchCheck,
  },
  {
    title: "Protected workspaces",
    description:
      "Sessions, documents, and threads now live inside user-isolated app storage.",
    icon: LockKeyhole,
  },
  {
    title: "Built for long PDFs",
    description:
      "Chunk overlap, vector search, and targeted context keep large documents practical.",
    icon: BookOpenText,
  },
];

const productStats = [
  { value: "100+", label: "page PDFs" },
  { value: "Top 4-6", label: "retrieved chunks" },
  { value: "2 modes", label: "single + all docs" },
  { value: "Local", label: "secure file persistence" },
];

const workflow = [
  "Authenticate into a private workspace",
  "Upload or reindex your PDF library",
  "Search one document or the whole collection",
  "Jump from answer citations back to the source page",
];

const appPanels = [
  {
    eyebrow: "Library lane",
    title: "Upload and index",
    copy: "Validate PDFs, create embeddings, and route straight into workspace chat.",
  },
  {
    eyebrow: "Retrieval layer",
    title: "Grounded context only",
    copy: "The chat experience stays constrained to retrieved evidence, not generic web answers.",
  },
  {
    eyebrow: "Session shell",
    title: "Protected flow",
    copy: "Password auth, signed cookies, and user-scoped document storage keep the app product-grade.",
  },
];

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="space-y-6 pb-6 pt-2 lg:space-y-8">
      <header className="panel px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center">
              <img src="/logo.png" alt="SmartDoc AI" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.32em] text-cyan-100/65">
                SmartDoc AI
              </p>
              <p className="text-sm font-semibold text-white">
                Retrieval product shell
              </p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
            <a href="#signals" className="premium-button-ghost">
              Signals
            </a>
            <a href="#workflow" className="premium-button-ghost">
              Workflow
            </a>
            {session ? (
              <>
                <span className="data-pill">
                  <span className="status-ring" />
                  Signed in as {session.name}
                </span>
                <Link href="/upload" className="premium-button">
                  Open workspace
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth" className="premium-button-secondary">
                  Sign in
                </Link>
                <Link href="/auth?mode=signup" className="premium-button">
                  Create account
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="panel reveal-rise overflow-hidden px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="grid gap-8 xl:grid-cols-[1.04fr_0.96fr] xl:items-center">
          <div className="space-y-6">
            <span className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Advanced document intelligence
            </span>

            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                A richer gateway into upload, retrieval, and grounded PDF work.
              </h1>
              <p className="max-w-2xl section-copy">
                SmartDoc now behaves like a real web product: authenticated entry,
                private workspaces, premium library management, and a retrieval UI
                that keeps the source in view while you question the document.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {session ? (
                <>
                  <Link href="/upload" className="premium-button">
                    Continue to library
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/chat" className="premium-button-secondary">
                    Open workspace
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/auth" className="premium-button">
                    Enter SmartDoc
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/upload" className="premium-button-secondary">
                    Explore library flow
                  </Link>
                </>
              )}
            </div>

            <div className="grid gap-3 pt-2 sm:grid-cols-2 xl:grid-cols-4">
              {productStats.map((stat) => (
                <div key={stat.label} className="metric-card">
                  <p className="text-2xl font-semibold text-white">{stat.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="panel-soft overflow-hidden p-5 sm:p-6">
              <div className="shine-surface absolute inset-0 opacity-25" />
              <div className="relative grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
                <div className="space-y-3">
                  <div className="data-pill">
                    <Workflow className="h-3.5 w-3.5 text-cyan-100" />
                    Live system loop
                  </div>

                  <div className="space-y-3">
                    {workflow.map((step, index) => (
                      <div
                        key={step}
                        className="flex items-center gap-3 rounded-[22px] border border-white/8 bg-slate-950/35 px-4 py-3"
                      >
                        <span className="mono flex h-8 w-8 items-center justify-center rounded-full bg-cyan-300/12 text-[11px] text-cyan-100">
                          0{index + 1}
                        </span>
                        <span className="text-sm text-slate-100">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-x-8 top-4 h-24 rounded-full bg-cyan-300/12 blur-3xl" />
                  <Image
                    src="/illustrations/gateway-rag.svg"
                    alt="Abstract retrieval pipeline illustration"
                    width={960}
                    height={960}
                    className="relative mx-auto w-full max-w-[420px] animate-[float-slow_16s_ease-in-out_infinite]"
                    priority
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {appPanels.map((panel) => (
                <article key={panel.title} className="panel-soft p-5">
                  <p className="mono text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">
                    {panel.eyebrow}
                  </p>
                  <h2 className="mt-3 text-lg font-semibold text-white">
                    {panel.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {panel.copy}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="signals" className="grid gap-4 lg:grid-cols-3">
        {productSignals.map(({ title, description, icon: Icon }, index) => (
          <article
            key={title}
            className="panel-soft reveal-rise p-6"
            style={{ animationDelay: `${index * 110}ms` }}
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/14 text-amber-100">
              <Icon className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{description}</p>
          </article>
        ))}
      </section>

      <section id="workflow" className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="panel-soft p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-100">
              <LayoutPanelTop className="h-6 w-6" />
            </div>
            <div>
              <span className="eyebrow">Product flow</span>
              <h2 className="mt-4 text-2xl font-semibold text-white">
                Gateway to auth, library, and workspace
              </h2>
            </div>
          </div>

          <p className="mt-4 section-copy">
            The app now moves cleanly from secure entry into upload and then into a
            conversation workspace that keeps retrieval, sources, and document
            context visible at once.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {session ? (
              <>
                <Link href="/upload" className="premium-button">
                  View library
                </Link>
                <Link href="/chat" className="premium-button-secondary">
                  Open workspace
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth?mode=signup" className="premium-button">
                  Create account
                </Link>
                <Link href="/auth?mode=signin" className="premium-button-secondary">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </article>

        <article className="panel-soft p-6 sm:p-7">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
              <p className="mono text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">
                Upload
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Premium drag-and-drop intake with validation, indexing, and library
                management.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
              <p className="mono text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">
                Retrieve
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Single-document and cross-document search modes with persistent
                threads.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
              <p className="mono text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">
                Review
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Viewer-linked answers let the user jump from the response back to
                the cited source.
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
