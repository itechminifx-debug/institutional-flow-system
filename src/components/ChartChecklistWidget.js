"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";

export default function ChartChecklistWidget() {
  const supabase = createClient();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("chart_checklist_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("session_date", today)
        .maybeSingle();

      setStatus(data);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return null;

  const phases = [
    "phase1_complete",
    "phase2_complete",
    "phase3_complete",
    "phase4_complete",
    "phase5_complete",
    "phase6_complete",
    "phase7_complete",
    "phase8_complete",
    "phase9_complete",
    "phase10_complete",
  ];

  const completed = status
    ? phases.filter((p) => status[p]).length
    : 0;
  const isComplete = completed === phases.length;

  return (
    <Link
      href="/chart-checklist"
      className={`block p-4 rounded-lg border transition ${
        isComplete
          ? "bg-green-950/30 border-green-800"
          : completed > 0
          ? "bg-yellow-950/30 border-yellow-800"
          : "bg-gray-900 border-gray-800 hover:border-blue-600"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">Chart Checklist</span>
        <span className="text-xs text-blue-400">Open →</span>
      </div>

      {isComplete ? (
        <>
          <p className="text-lg font-bold text-green-400">
            ✅ {completed}/10 phases
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Chart fully read today
          </p>
        </>
      ) : completed > 0 ? (
        <>
          <p className="text-lg font-bold text-yellow-400">
            {completed}/10 phases
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Continue the checklist
          </p>
        </>
      ) : (
        <>
          <p className="text-lg font-bold text-gray-300">
            Not started today
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Walk the chart before trading
          </p>
        </>
      )}
    </Link>
  );
}