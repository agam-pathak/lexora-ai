import type { Metadata } from "next";

import ScholarWorkspace from "@/components/scholar/ScholarWorkspace";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Scholar – Exam Strategist",
  description:
    "AI-powered mock assessments for UPSC, Banking, GATE, SSC, and CAT competitive exams with adaptive difficulty and performance analytics.",
};

export default async function ScholarPage() {
  const session = await requireSession();

  return <ScholarWorkspace userId={session.userId} userName={session.name} />;
}
