"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  X,
  AlertTriangle,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */

type ToastVariant = "success" | "error" | "info" | "warning";

type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
};

type ToastContextValue = {
  toasts: Toast[];
  addToast: (message: string, variant?: ToastVariant, duration?: number) => void;
  removeToast: (id: string) => void;
};

/* ── Context ────────────────────────────────────────────────── */

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

/* ── Provider ───────────────────────────────────────────────── */

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant = "info", duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, message, variant, duration }]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

/* ── Visuals ────────────────────────────────────────────────── */

const variantStyles: Record<
  ToastVariant,
  { border: string; bg: string; text: string; icon: typeof Info }
> = {
  success: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    icon: CheckCircle2,
  },
  error: {
    border: "border-rose-500/30",
    bg: "bg-rose-500/10",
    text: "text-rose-300",
    icon: AlertCircle,
  },
  info: {
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/10",
    text: "text-cyan-300",
    icon: Info,
  },
  warning: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    text: "text-amber-300",
    icon: AlertTriangle,
  },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const style = variantStyles[toast.variant];
  const Icon = style.icon;

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border ${style.border} ${style.bg} px-4 py-3 shadow-2xl backdrop-blur-xl animate-[slideInToast_0.35s_cubic-bezier(0.16,1,0.3,1)_forwards]`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.text}`} />
      <p className="flex-1 text-sm font-medium text-slate-200">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-lg p-1 text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
        aria-label="Dismiss toast"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex w-full max-w-sm flex-col gap-2.5 pointer-events-auto">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
