"use client";

import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

import {
  EXAM_CATEGORIES,
  EXAM_LABELS,
  type ExamCategory,
} from "@/lib/scholar/types";

const EXAM_ICONS: Record<ExamCategory, string> = {
  upsc_cse: "🏛️",
  banking_ibps: "🏦",
  gate_cs: "💻",
  gate_ee: "⚡",
  gate_me: "⚙️",
  ssc_cgl: "📋",
  cat_mba: "📊",
};

type ExamSelectorProps = {
  selectedExam: ExamCategory;
  onExamChange: (exam: ExamCategory) => void;
  disabled?: boolean;
};

export default function ExamSelector({
  selectedExam,
  onExamChange,
  disabled = false,
}: ExamSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setIsOpen(!isOpen);
        }}
        disabled={disabled}
        className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all ${
          disabled
            ? "cursor-not-allowed border-white/[0.04] bg-white/[0.02] text-slate-500"
            : "border-white/[0.08] bg-white/[0.04] text-white hover:border-amber-400/30 hover:bg-white/[0.06]"
        }`}
        id="scholar-exam-selector"
      >
        <span className="text-base">{EXAM_ICONS[selectedExam]}</span>
        <span className="hidden sm:inline">
          {EXAM_LABELS[selectedExam]}
        </span>
        <span className="sm:hidden">
          {selectedExam.replace("_", " ").toUpperCase()}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/95 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2">
          <div className="p-2">
            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Select Target Exam
            </p>

            {EXAM_CATEGORIES.map((exam) => {
              const isActive = selectedExam === exam;
              return (
                <button
                  key={exam}
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onExamChange(exam);
                    setIsOpen(false);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onExamChange(exam);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                    isActive
                      ? "bg-amber-500/10 text-amber-200 ring-1 ring-amber-400/20"
                      : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                  }`}
                  id={`scholar-exam-option-${exam}`}
                >
                  <span className="text-lg">{EXAM_ICONS[exam]}</span>
                  <div className="flex-1">
                    <p className="font-semibold">{EXAM_LABELS[exam]}</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">
                      {exam.replace(/_/g, " ")}
                    </p>
                  </div>
                  {isActive && (
                    <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
