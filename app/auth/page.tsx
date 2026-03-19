"use client";

import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

type AuthMode = "signin" | "signup" | "forgot" | "reset";

type FormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const modeCopy: Record<
  AuthMode,
  {
    title: string;
    subtitle: string;
    submitLabel: string;
  }
> = {
  signin: {
    title: "Welcome back",
    subtitle: "Return to your private SmartDoc workspace.",
    submitLabel: "Sign in",
  },
  signup: {
    title: "Create your workspace",
    subtitle: "Start a protected account and move straight into indexing.",
    submitLabel: "Create account",
  },
  forgot: {
    title: "Reset access",
    subtitle: "Generate a recovery link for the email tied to this workspace.",
    submitLabel: "Send reset link",
  },
  reset: {
    title: "Choose a new password",
    subtitle: "Finish the recovery flow with a secure replacement password.",
    submitLabel: "Reset password",
  },
};

const trustSignals = [
  "Signed httpOnly sessions",
  "Isolated document storage",
  "Grounded RAG workspace",
];

const securityDeck = [
  {
    title: "Server sessions",
    copy: "Authentication now creates real signed cookies instead of temporary client-only state.",
  },
  {
    title: "User workspaces",
    copy: "Documents, index manifests, and saved threads stay scoped to the authenticated account.",
  },
  {
    title: "Recovery loop",
    copy: "Forgot password now produces a secure local reset path when mail delivery is not configured.",
  },
];

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [resetPreviewPath, setResetPreviewPath] = useState("");

  const token = searchParams.get("token") || "";
  const nextPath = searchParams.get("next") || "/upload";

  useEffect(() => {
    const requestedMode = searchParams.get("mode");

    if (
      requestedMode === "signin" ||
      requestedMode === "signup" ||
      requestedMode === "forgot" ||
      requestedMode === "reset"
    ) {
      setMode(requestedMode);
      setErrorMessage("");
      setStatusMessage("");
      setResetPreviewPath("");
    }
  }, [searchParams]);

  const passwordStrengthLabel = useMemo(() => {
    if (form.password.length >= 12) {
      return "Strong";
    }

    if (form.password.length >= 8) {
      return "Good";
    }

    if (form.password.length >= 5) {
      return "Fair";
    }

    return "Weak";
  }, [form.password.length]);

  function updateField(field: keyof FormState, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
    setErrorMessage("");
    setStatusMessage("");
    setResetPreviewPath("");
  }

  async function handlePasswordAuth(endpoint: string, payload: object) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Authentication failed.");
    }

    return data as {
      message?: string;
      resetPath?: string | null;
    };
  }

  async function handleSubmit() {
    setSubmitting(true);
    setErrorMessage("");
    setStatusMessage("");
    setResetPreviewPath("");

    try {
      if (mode === "signup") {
        if (!form.name.trim()) {
          throw new Error("Full name is required for sign up.");
        }

        if (!form.email.trim()) {
          throw new Error("Email is required.");
        }

        if (form.password.length < 8) {
          throw new Error("Use at least 8 characters for the password.");
        }

        if (form.password !== form.confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        await handlePasswordAuth("/api/auth/signup", {
          name: form.name,
          email: form.email,
          password: form.password,
        });
        router.push(nextPath);
        router.refresh();
        return;
      }

      if (mode === "signin") {
        if (!form.email.trim() || !form.password.trim()) {
          throw new Error("Email and password are required.");
        }

        await handlePasswordAuth("/api/auth/signin", {
          email: form.email,
          password: form.password,
        });
        router.push(nextPath);
        router.refresh();
        return;
      }

      if (mode === "forgot") {
        if (!form.email.trim()) {
          throw new Error("Email is required.");
        }

        const data = await handlePasswordAuth("/api/auth/forgot", {
          email: form.email,
        });

        setStatusMessage(data.message || "Recovery link prepared.");
        setResetPreviewPath(data.resetPath || "");
        return;
      }

      if (!token) {
        throw new Error("The recovery token is missing.");
      }

      if (form.password.length < 8) {
        throw new Error("Use at least 8 characters for the new password.");
      }

      if (form.password !== form.confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const data = await handlePasswordAuth("/api/auth/reset", {
        token,
        password: form.password,
      });

      setStatusMessage(data.message || "Password updated successfully.");
      setMode("signin");
      setForm((currentForm) => ({
        ...currentForm,
        password: "",
        confirmPassword: "",
      }));
      router.replace("/auth?mode=signin");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Authentication failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const currentCopy = modeCopy[mode];

  return (
    <div className="grid gap-6 pb-6 pt-2 xl:grid-cols-[1.02fr_0.98fr]">
      <section className="panel reveal-rise relative overflow-hidden px-6 py-7 sm:px-8 lg:px-10">
        <div className="shine-surface absolute inset-0 opacity-20" />
        <div className="relative flex h-full flex-col justify-between gap-8">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/14 text-cyan-100">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="mono text-[10px] uppercase tracking-[0.32em] text-cyan-100/65">
                    SmartDoc AI
                  </p>
                  <p className="text-sm font-semibold text-white">Secure gateway</p>
                </div>
              </Link>

              <Link href="/" className="premium-button-secondary">
                Back home
              </Link>
            </div>

            <div className="mt-8 space-y-4">
              <span className="eyebrow">
                <LockKeyhole className="h-3.5 w-3.5" />
                Protected entry
              </span>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Enter a richer document workspace with real auth, real storage, and
                grounded answers.
              </h1>
              <p className="max-w-2xl section-copy">
                This gateway now leads into an authenticated product flow instead of
                a demo shell. Sign in, upload privately, then move into a workspace
                built around retrieval and citations.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {trustSignals.map((signal) => (
                <div key={signal} className="metric-card">
                  <p className="text-sm font-medium text-white">{signal}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {securityDeck.map((item) => (
                <article key={item.title} className="panel-soft p-4">
                  <p className="mono text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">
                    Security
                  </p>
                  <h2 className="mt-3 text-base font-semibold text-white">
                    {item.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {item.copy}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[540px]">
            <div className="absolute inset-x-10 top-6 h-24 rounded-full bg-cyan-300/14 blur-3xl" />
            <Image
              src="/illustrations/auth-orbit.svg"
              alt="Abstract authentication orbit illustration"
              width={960}
              height={960}
              className="relative mx-auto w-full animate-[float-slow_16s_ease-in-out_infinite]"
              priority
            />
          </div>
        </div>
      </section>

      <section className="panel reveal-rise overflow-hidden p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_0.78fr]">
          <div className="panel-soft p-5 sm:p-6">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["signin", "Sign in"],
                  ["signup", "Sign up"],
                  ["forgot", "Forgot"],
                ] as const
              ).map(([modeValue, label]) => (
                <button
                  key={modeValue}
                  type="button"
                  onClick={() => {
                    setMode(modeValue);
                    setErrorMessage("");
                    setStatusMessage("");
                    setResetPreviewPath("");
                  }}
                  className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${
                    mode === modeValue
                      ? "bg-cyan-300 text-slate-950"
                      : "border border-white/12 bg-white/[0.05] text-slate-300 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}

              {mode === "reset" ? (
                <span className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-4 py-2.5 text-sm font-medium text-white">
                  Reset password
                </span>
              ) : null}
            </div>

            <div className="mt-6">
              <p className="mono text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">
                {mode === "signup"
                  ? "New workspace"
                  : mode === "forgot"
                    ? "Recovery"
                    : mode === "reset"
                      ? "Password reset"
                      : "Returning access"}
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                {currentCopy.title}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                {currentCopy.subtitle}
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {mode === "signup" ? (
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                    <UserRound className="h-3.5 w-3.5" />
                    Full name
                  </span>
                  <input
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Workspace owner"
                    className="w-full rounded-[24px] border border-white/10 bg-slate-950/35 px-4 py-3.5 text-sm text-white outline-none transition focus:border-cyan-300/45 focus:ring-2 focus:ring-cyan-300/15"
                  />
                </label>
              ) : null}

              {mode !== "reset" ? (
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="you@workspace.ai"
                    className="w-full rounded-[24px] border border-white/10 bg-slate-950/35 px-4 py-3.5 text-sm text-white outline-none transition focus:border-cyan-300/45 focus:ring-2 focus:ring-cyan-300/15"
                  />
                </label>
              ) : null}

              {mode !== "forgot" ? (
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                    <KeyRound className="h-3.5 w-3.5" />
                    {mode === "reset" ? "New password" : "Password"}
                  </span>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(event) => updateField("password", event.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full rounded-[24px] border border-white/10 bg-slate-950/35 px-4 py-3.5 pr-12 text-sm text-white outline-none transition focus:border-cyan-300/45 focus:ring-2 focus:ring-cyan-300/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((currentState) => !currentState)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </label>
              ) : null}

              {mode === "signup" || mode === "reset" ? (
                <>
                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                      <LockKeyhole className="h-3.5 w-3.5" />
                      Confirm password
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(event) =>
                        updateField("confirmPassword", event.target.value)
                      }
                      placeholder="Repeat the password"
                      className="w-full rounded-[24px] border border-white/10 bg-slate-950/35 px-4 py-3.5 text-sm text-white outline-none transition focus:border-cyan-300/45 focus:ring-2 focus:ring-cyan-300/15"
                    />
                  </label>

                  <div className="panel-soft p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-300">Password strength</span>
                      <span className="text-sm font-medium text-white">
                        {passwordStrengthLabel}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <span
                          key={index}
                          className={`h-2 rounded-full ${
                            index <
                            (passwordStrengthLabel === "Strong"
                              ? 4
                              : passwordStrengthLabel === "Good"
                                ? 3
                                : passwordStrengthLabel === "Fair"
                                  ? 2
                                  : form.password.length > 0
                                    ? 1
                                    : 0)
                              ? "bg-cyan-300"
                              : "bg-white/8"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="premium-button disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {submitting ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    Processing...
                  </>
                ) : (
                  <>
                    {currentCopy.submitLabel}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  setErrorMessage(
                    "Google OAuth is not configured in this local workspace yet.",
                  )
                }
                disabled={submitting || mode === "forgot" || mode === "reset"}
                className="premium-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="currentColor"
                >
                  <path d="M21.8 12.23c0-.76-.07-1.49-.2-2.19H12v4.15h5.49a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.77 3.05-4.39 3.05-7.6Z" />
                  <path d="M12 22c2.76 0 5.08-.92 6.77-2.49l-3.3-2.56c-.92.61-2.08.97-3.47.97-2.67 0-4.94-1.8-5.75-4.21H2.84v2.64A10 10 0 0 0 12 22Z" />
                  <path d="M6.25 13.71A5.99 5.99 0 0 1 6 12c0-.59.09-1.16.25-1.71V7.65H2.84A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.35l3.21-2.64Z" />
                  <path d="M12 6.08c1.5 0 2.84.52 3.9 1.55l2.92-2.92C17.08 3.09 14.76 2 12 2A10 10 0 0 0 2.84 7.65l3.41 2.64c.81-2.41 3.08-4.21 5.75-4.21Z" />
                </svg>
                Continue with Google
              </button>
            </div>

            {statusMessage ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-emerald-300">{statusMessage}</p>
                {resetPreviewPath ? (
                  <Link
                    href={resetPreviewPath}
                    className="inline-flex items-center gap-2 text-sm text-cyan-200 underline-offset-4 hover:underline"
                  >
                    Open recovery link preview
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            ) : null}

            {errorMessage ? (
              <p className="mt-4 text-sm text-rose-300">{errorMessage}</p>
            ) : null}
          </div>

          <aside className="grid gap-4">
            <div className="panel-soft p-5">
              <p className="mono text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">
                Next destination
              </p>
              <p className="mt-3 text-lg font-semibold text-white">{nextPath}</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Successful access routes directly into the next workspace step.
              </p>
            </div>

            <div className="panel-soft p-5">
              <p className="mono text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">
                Access notes
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-[22px] border border-white/8 bg-slate-950/35 p-4">
                  <p className="text-sm font-semibold text-white">Session model</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    The app uses signed httpOnly cookies and protected layouts for
                    workspace routes.
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-slate-950/35 p-4">
                  <p className="text-sm font-semibold text-white">Library privacy</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Files, manifests, and saved threads now live inside the user
                    workspace instead of a shared store.
                  </p>
                </div>
              </div>
            </div>

            {mode === "reset" && !token ? (
              <div className="panel-soft border border-rose-300/16 bg-rose-300/10 p-5 text-sm text-rose-200">
                The recovery link is missing its reset token. Request a new one from
                the forgot-password tab.
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="panel flex min-h-[720px] items-center justify-center p-8 text-center">
          <div>
            <span className="eyebrow">Authentication</span>
            <h1 className="mt-5 text-3xl font-semibold text-white">
              Loading secure gateway
            </h1>
          </div>
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
