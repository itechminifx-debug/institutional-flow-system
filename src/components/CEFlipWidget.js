"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";

export default function CEFlipWidget() {
  const supabase = createClient();
  const [stats, setStats] = useState({ total: 0, flipReady: 0 });
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
        .from("ce_flips")
        .select("state")
        .eq("user_id", user.id);

      const safe = data || [];
      const flipReady = safe.filter(
        (c) => c.state === "flipped" || c.state === "retested"
      ).length;

      setStats({ total: safe.length, flipReady });
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return null;

  return (
    <Link
      href="/ce-tracker"
      className={`block p-4 rounded-lg border transition ${
        stats.flipReady > 0
          ? "bg-orange-950/40 border-orange-700"
          : "bg-gray-900 border-gray-800 hover:border-blue-600"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">CE Flip Tracker</span>
        <span className="text-xs text-blue-400">Open →</span>
      </div>

      {stats.flipReady > 0 ? (
        <>
          <p className="text-lg font-bold text-orange-300">
            🟠 {stats.flipReady} flip ready
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Sell setup available
          </p>
        </>
      ) : stats.total > 0 ? (
        <>
          <p className="text-lg font-bold text-blue-300">
            {stats.total} CE lines
          </p>
          <p className="text-xs text-gray-500 mt-1">None flipped yet</p>
        </>
      ) : (
        <>
          <p className="text-lg font-bold text-gray-400">No CE lines</p>
          <p className="text-xs text-gray-500 mt-1">
            Create a setup to track
          </p>
        </>
      )}
    </Link>
  );
}