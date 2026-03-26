"use client";

import { Search, BrainCircuit, FileSearch, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const scholarSteps = [
  { text: "Analyzing exam syllabus", icon: BrainCircuit },
  { text: "Selecting question patterns", icon: Search },
  { text: "Generating assessment items", icon: FileSearch },
  { text: "Validating & scoring rubric", icon: Sparkles },
  { text: "Finalizing mock paper", icon: Loader2 },
];

export default function ScholarThinking() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const intervals = [400, 1200, 2400, 4000];
    const timeouts: NodeJS.Timeout[] = [];

    intervals.forEach((delay, index) => {
      const timeout = setTimeout(() => {
        setStepIndex(index + 1);
      }, delay);
      timeouts.push(timeout);
    });

    return () => timeouts.forEach((t) => clearTimeout(t));
  }, []);

  const StepIcon = scholarSteps[stepIndex].icon;

  return (
    <div className="flex flex-col items-center gap-6 py-12">
      {/* Animated orb */}
      <div className="relative">
        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/10 shadow-[0_0_60px_rgba(251,191,36,0.15)] animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <StepIcon
            className={`h-10 w-10 text-amber-300 ${stepIndex === 4 ? "animate-spin" : "animate-pulse"}`}
          />
        </div>
      </div>

      {/* Steps list */}
      <div className="flex flex-col gap-2.5">
        {scholarSteps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === stepIndex;
          const isDone = index < stepIndex;

          return (
            <div
              key={step.text}
              className={`flex items-center gap-3 rounded-2xl px-5 py-2.5 transition-all duration-500 ${
                isActive
                  ? "border border-amber-400/20 bg-amber-500/[0.06] text-amber-200 shadow-lg"
                  : isDone
                    ? "text-slate-500"
                    : "text-slate-600"
              }`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                  isActive
                    ? "bg-amber-400/15 text-amber-300"
                    : isDone
                      ? "bg-emerald-400/10 text-emerald-400"
                      : "bg-white/[0.03] text-slate-600"
                }`}
              >
                {isDone ? (
                  <span className="text-xs">✓</span>
                ) : (
                  <Icon
                    className={`h-3.5 w-3.5 ${isActive ? "animate-pulse" : ""}`}
                  />
                )}
              </div>
              <span
                className={`text-sm font-medium ${isDone ? "line-through" : ""}`}
              >
                {step.text}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Lexora Scholar is preparing your assessment...
      </p>
    </div>
  );
}
