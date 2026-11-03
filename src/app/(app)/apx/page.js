// app/apx/page.jsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { evaluateApx } from "@/lib/apxEngine";
import ApxCard from "@/components/ApxCard";

export default function ApxDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data, error: err } = await supabase
        .from("apx_setups")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (err) setError(err.message);
      else setSetups(data || []);
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  const evaluated = useMemo(
    () => setups.map((row) => ({ row, data: evaluateApx(row) })),
    [setups]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return evaluated;
    if (filter === "valid") return evaluated.filter((e) => e.data.preEntryReady);
    if (filter === "invalid") return evaluated.filter((e) => !e.data.preEntryReady);
    if (filter === "active") return evaluated.filter((e) => e.row.trade_result === "active");
    if (filter === "won") return evaluated.filter((e) => e.row.trade_result === "won");
    if (filter === "lost") return evaluated.filter((e) => e.row.trade_result === "lost");
    return evaluated;
  }, [evaluated, filter]);

  const stats = useMemo(() => {
    const total = evaluated.length;
    const valid = evaluated.filter((e) => e.data.preEntryReady).length;
    const active = evaluated.filter((e) => e.row.trade_result === "active").length;
    const won = evaluated.filter((e) => e.row.trade_result === "won").length;
    const lost = evaluated.filter((e) => e.row.trade_result === "lost").length;
    const closed = won + lost;
    const winRate = closed > 0 ? Math.round((won / closed) * 100) : null;
    return { total, valid, active, won, lost, winRate };
  }, [evaluated]);

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-amber-400">🎯 APX System</h1>
            <p className="text-gray-400 text-sm">Institutional flow · standard / shallow / turtle soup</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/apx/manual" className="text-xs px-3 py-2 rounded-lg bg-amber-600 text-black font-bold">
              + New Setup
            </Link>
            <Link href="/apx/journal" className="text-xs px-3 py-2 rounded-lg bg-gray-800 font-semibold">
              Journal
            </Link>
            <Link href="/apx/history" className="text-xs px-3 py-2 rounded-lg bg-gray-800 font-semibold">
              History
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Stat label="Total" value={stats.total} />
          <Stat label="Valid" value={stats.valid} tone="green" />
          <Stat label="Active" value={stats.active} tone="blue" />
          <Stat label="Won" value={stats.won} tone="green" />
          <Stat label="Lost" value={stats.lost} tone="red" />
          <Stat label="Win rate" value={stats.winRate == null ? "—" : `${stats.winRate}%`} tone="amber" />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            ["all", "All"], ["valid", "Valid"], ["invalid", "Invalid"],
            ["active", "Active"], ["won", "Won"], ["lost", "Lost"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition ${
                filter === key
                  ? "bg-amber-600 border-amber-500 text-black"
                  : "bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>
        )}

        {loading ? (
          <p className="text-gray-400 text-sm">Loading setups…</p>
        ) : filtered.length === 0 ? (
          <div className="p-6 rounded-lg bg-gray-900 border border-amber-800/40 text-center space-y-2">
            <p className="text-sm text-gray-300 font-semibold">No APX setups yet</p>
            <p className="text-xs text-gray-500">Start with a manual setup — standard, shallow, or turtle soup.</p>
            <Link href="/apx/manual" className="inline-block mt-2 text-xs px-3 py-2 rounded-lg bg-amber-600 text-black font-bold">
              + New Setup
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(({ row, data }) => (
              <div key={row.id} className="cursor-pointer" onClick={() => router.push(`/apx/${row.id}`)}>
                <ApxCard data={data} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value, tone = "gray" }) {
  const color = tone === "green" ? "text-green-300" : tone === "red" ? "text-red-300" : tone === "blue" ? "text-blue-300" : tone === "amber" ? "text-amber-300" : "text-white";
  return (
    <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}