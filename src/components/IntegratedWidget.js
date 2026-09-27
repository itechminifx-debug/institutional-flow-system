"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";

export default function IntegratedWidget() {
  const supabase = createClient();
  const [latest, setLatest] = useState(null);
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
        .from("integrated_checks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setLatest(data);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return null;

  if (!latest) {
    return (
      <Link
        href="/integrated"
        className="block p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-600 transition"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Integrated Check</span>
          <span className="text-xs text-blue-400">Open →</span>
        </div>
        <p className="text-lg font-bold text-gray-400">Not run yet</p>
        <p className="text-xs text-gray-500 mt-1">
          10-question gate
        </p>
      </Link>
    );
  }

  return (
    <Link
      href="/integrated"
      className={`block p-4 rounded-lg border transition ${
        latest.passed
          ? "bg-green-950/40 border-green-800"
          : "bg-yellow-950/40 border-yellow-800"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">Integrated Check</span>
        <span className="text-xs text-blue-400">Open →</span>
      </div>
      <p
        className={`text-2xl font-bold ${
          latest.passed ? "text-green-400" : "text-yellow-400"
        }`}
      >
        {latest.score}/10
      </p>
      <p className="text-xs text-gray-500 mt-1">
        {latest.passed ? "✅ Passed" : "⚠️ Failed"} · {latest.pair}
      </p>
    </Link>
  );
}