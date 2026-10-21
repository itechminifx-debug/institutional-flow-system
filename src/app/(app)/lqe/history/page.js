"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }

function groupLabel(isoDate) {
  const d = startOfDay(isoDate);
  const now = startOfDay(new Date());
  const diffDays = Math.round((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

function rowDate(r) { return r.status === "draft" ? r.updated_at || r.created_at : r.created_at; }

function groupRowsByDay(rows) {
  const groups = {};
  rows.forEach((r) => {
    const key = startOfDay(rowDate(r)).toISOString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return Object.entries(groups)
    .sort((a, b) => new Date(b[0]) - new Date(a[0]))
    .map(([key, items]) => ({
      key, label: groupLabel(key),
      items: items.sort((a, b) => new Date(rowDate(b)) - new Date(rowDate(a))),
    }));
}

export default function LqeHistoryPage() {
  const router = useRouter();
  const supabase = createClient();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRows = useCallback(async () => {
    setLoading(true);
    const { data, error: loadErr } = await supabase
      .from("lqe_setups")
      .select("*")
      .order("updated_at", { ascending: false });
    if (loadErr) { setError(loadErr.message); setLoading(false); return; }
    setRows(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadRows(); }, [loadRows]);

  useEffect(() => {
    const handleFocus = () => { loadRows(); };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadRows]);

  const groups = useMemo(() => groupRowsByDay(rows), [rows]);

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">📜 LQE History</h1>
            <p className="text-gray-400 text-sm">Every LQE setup, grouped by day.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={loadRows} className="text-xs px-3 py-2 rounded-lg bg-gray-800 text-gray-300 font-semibold">🔄 Refresh</button>
            <button type="button" onClick={() => router.push("/lqe/journal")} className="text-xs px-3 py-2 rounded-lg bg-purple-900/40 text-purple-300 font-semibold">📓 Journal</button>
            <button type="button" onClick={() => router.push("/lqe")} className="text-xs px-3 py-2 rounded-lg bg-orange-900/40 text-orange-300 font-semibold">+ New</button>
          </div>
        </div>

        {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}
        {loading && <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>}

        {!loading && rows.length === 0 && (
          <div className="p-6 rounded-lg bg-orange-950/30 border border-orange-900/50 text-center space-y-3">
            <p className="text-sm text-orange-200">No LQE history yet.</p>
            <button type="button" onClick={() => router.push("/lqe")} className="px-4 py-2 rounded-lg bg-orange-800 font-bold text-sm">Start</button>
          </div>
        )}

        {!loading && groups.length > 0 && (
          <div className="space-y-5">
            {groups.map((g) => (
              <div key={g.key} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-800" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{g.label}</p>
                  <div className="flex-1 h-px bg-gray-800" />
                </div>
                {g.items.map((r) => {
                  const isDraft = r.status === "draft";
                  const time = new Date(rowDate(r)).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={r.id} onClick={() => router.push(`/lqe/${r.id}`)} className={`p-3 rounded-lg border cursor-pointer ${isDraft ? "bg-yellow-950/20 border-yellow-800/60 hover:border-yellow-600" : "bg-gray-900 border-gray-800 hover:border-orange-700"}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500 tabular-nums">{time}</span>
                        {isDraft && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 border border-yellow-700 text-yellow-200 font-bold">📝</span>}
                        <span className="text-sm font-bold">{r.pair}</span>
                        <span className="text-xs text-gray-500">· {r.timeframe}</span>
                        {r.daily_bias && <span className="text-xs text-gray-400">· {r.daily_bias === "bullish" ? "🟢" : "🔴"}</span>}
                        {r.shallow_pullback_mode && <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-yellow-900/40 border-yellow-700 text-yellow-200 font-bold">⚠️ SHALLOW</span>}
                      </div>
                      {!isDraft && (
                        <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
                          <div><p className="text-gray-500">Entry</p><p className="font-bold tabular-nums text-yellow-400">{r.entry_price ? formatPrice(r.entry_price) : "—"}</p></div>
                          <div><p className="text-gray-500">SL</p><p className="font-bold tabular-nums text-red-400">{r.stop_loss ? formatPrice(r.stop_loss) : "—"}</p></div>
                          <div><p className="text-gray-500">TP</p><p className="font-bold tabular-nums text-green-400">{r.target_price ? formatPrice(r.target_price) : "—"}</p></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}