"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { mssInfo } from "@/lib/mssHelpers";

export default function MSSWidget() {
  const supabase = createClient();
  const [latest, setLatest] = useState(null);
  const [count, setCount] = useState(0);
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

      const { data } = await supabase
        .from("mss_events")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const safe = data || [];
      setCount(safe.length);
      setLatest(safe[0] || null);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return null;

  if (!latest) {
    return (
      <Link
        href="/mss"
        className="block p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-600 transition"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">MSS</span>
          <span className="text-xs text-blue-400">Open →</span>
        </div>
        <p className="text-lg font-bold text-gray-400">No MSS logged</p>
        <p className="text-xs text-gray-500 mt-1">
          Log a structure shift
        </p>
      </Link>
    );
  }

  const info = mssInfo(latest.direction);

  return (
    <Link
      href="/mss"
      className={`block p-4 rounded-lg border transition ${info.color}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm opacity-70">Latest MSS</span>
        <span className="text-xs text-blue-400">Open →</span>
      </div>
      <p className="text-2xl mb-1">{info.emoji}</p>
      <p className="text-lg font-bold">{info.label}</p>
      <p className="text-xs opacity-70 mt-1">
        {latest.pair} · {latest.timeframe}
      </p>
      <p className="text-xs opacity-50 mt-1">
        {count} event{count === 1 ? "" : "s"} total
      </p>
    </Link>
  );
}