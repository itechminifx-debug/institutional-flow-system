"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";

export default function MindsetWidget() {
  const supabase = createClient();
  const [todayCheck, setTodayCheck] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchToday() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];

      const { data } = await supabase
        .from("mindset_checks")
        .select("*")
        .eq("user_id", user.id)
        .eq("check_date", today)
        .single();

      setTodayCheck(data);
      setLoading(false);
    }
    fetchToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Link
      href="/mindset"
      className={`block p-4 rounded-lg border transition ${
        todayCheck
          ? todayCheck.emotional_pass
            ? "bg-green-950/40 border-green-800"
            : "bg-yellow-950/40 border-yellow-800"
          : "bg-gray-900 border-gray-800"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">Mindset</span>
        <span className="text-xs text-blue-400">
          {todayCheck ? "Review →" : "Complete →"}
        </span>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : todayCheck ? (
        <>
          <p
            className={`text-lg font-bold ${
              todayCheck.emotional_pass
                ? "text-green-400"
                : "text-yellow-400"
            }`}
          >
            {todayCheck.emotional_pass
              ? "✅ Prepared"
              : "⚠️ Emotional Check Flagged"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Ritual completed today
          </p>
        </>
      ) : (
        <>
          <p className="text-lg font-bold text-gray-300">
            Not completed today
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Tap to prepare your mind →
          </p>
        </>
      )}
    </Link>
  );
}