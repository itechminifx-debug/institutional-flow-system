"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { verdictStyle } from "@/lib/trendFactors";

export default function TrendWidget() {
  const supabase = createClient();
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLatest() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("trend_snapshots")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setLatest(data);
      setLoading(false);
    }
    fetchLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verdictMap = {
    "Strong Uptrend": "strong-up",
    Uptrend: "up",
    Sideways: "sideways",
    Downtrend: "down",
    "Strong Downtrend": "strong-down",
  };

  const key = latest ? verdictMap[latest.verdict] : "none";
  const style = verdictStyle(key);

  return (
    <Link
      href="/trend"
      className={`block p-4 rounded-lg border ${style.bg} ${style.border} hover:opacity-90 transition`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">Trend Analyzer</span>
        <span className="text-xs text-blue-400">New →</span>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : latest ? (
        <>
          <p className="text-xs text-gray-500 mb-1">
            {latest.pair} · {latest.timeframe}
          </p>
          <p className={`text-xl font-bold ${style.text}`}>
            {latest.verdict}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {latest.bullish_count}🟢 · {latest.bearish_count}🔴
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-400">
            No trend analysis yet.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Tap to run your first check →
          </p>
        </>
      )}
    </Link>
  );
}