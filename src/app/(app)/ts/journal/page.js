"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import { relativeTime } from "@/lib/decksEngine";

function resultBadge(result) {
  const map = {
    active: { label: "🎯 Active", cls: "bg-blue-900/40 border-blue-700 text-blue-200" },
    won:    { label: "✅ Won",    cls: "bg-green-900/40 border-green-700 text-green-200" },
    lost:   { label: "🔴 Lost",   cls: "bg-red-900/40 border-red-700 text-red-200" },
  };
  return map[result] || null;
}

export default function TsJournalPage() {
  const router = useRouter();
  const supabase = createClient();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterBias, setFilterBias] = useState("all");
  const [filterResult, setFilterResult] = useState("all");
  const [deletingId, setDeletingId] = useState(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    const { data, error: loadErr } = await supabase
      .from("ts_setups")
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const hay = `${r.pair || ""} ${r.notes || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterBias !== "all" && r.d1_bias !== filterBias) return false;
      if (filterResult !== "all") {
        if (filterResult === "none" && r.trade_result) return false;
        if (filterResult !== "none" && r.trade_result !== filterResult) return false;
      }
      return true;
    });
  }, [rows, search, filterBias, filterResult]);

  const drafts = useMemo(
    () => filtered.filter((r) => r.status === "draft").sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)),
    [filtered]
  );
  const complete = useMemo(
    () => filtered.filter((r) => r.status !== "draft").sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [filtered]
  );

  const stats = useMemo(() => {
    const total = rows.length;
    const draftsCount = rows.filter((r) => r.status === "draft").length;
    const wins = rows.filter((r) => r.trade_result === "won").length;
    const losses = rows.filter((r) => r.trade_result === "lost").length;
    const active = rows.filter((r) => r.trade_result === "active").length;
    
    // Win Rate (Won / (Won + Lost))
    const closed = wins + losses;
    const winRate = closed > 0 ? Math.round((wins / closed) * 100) : 0;

    return { total, draftsCount, wins, losses, active, winRate };
  }, [rows]);

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm("Delete this TS setup?")) return;
    setDeletingId(id);
    const { error: delErr } = await supabase.from("ts_setups").delete().eq("id", id);
    if (delErr) { setError(delErr.message); setDeletingId(null); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
  }

  function renderRow(r, isDraft) {
    const resBadge = resultBadge(r.trade_result);

    return (
      <div
        key={r.id}
        onClick={() => router.push(`/ts/${r.id}`)}
        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
          isDraft
            ? "bg-yellow-950/20 border-yellow-800/60 hover:border-yellow-600"
            : "bg-gray-900 border-gray-800 hover:border-violet-700"
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {isDraft && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 border border-yellow-700 text-yellow-200 font-bold">📝 DRAFT</span>
            )}
            <span className="text-sm font-bold">{r.pair}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${
              r.d1_bias === "bearish" ? "bg-red-900/30 border-red-800 text-red-200" : "bg-green-900/30 border-green-800 text-green-200"
            }`}>
              {r.d1_bias === "bearish" ? "🔴 Bear" : "🟢 Bull"}
            </span>
            
            {!isDraft && resBadge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${resBadge.cls}`}>{resBadge.label}</span>
            )}
            {r.tp1_taken && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-cyan-900/30 border-cyan-800 text-cyan-200 font-bold">50% Taken</span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => handleDelete(r.id, e)}
            disabled={deletingId === r.id}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            {deletingId === r.id ? "..." : "✕"}
          </button>
        </div>

        {isDraft ? (
          <p className="text-xs text-yellow-300/80 mt-2">Last saved {relativeTime(r.updated_at || r.created_at)}</p>
        ) : (
          <div className="grid grid-cols-4 gap-3 mt-2 text-xs">
            <div><p className="text-gray-500">Entry</p><p className="font-bold tabular-nums text-yellow-400">{r.entry_price ? formatPrice(r.entry_price) : "—"}</p></div>
            <div><p className="text-gray-500">SL</p><p className="font-bold tabular-nums text-red-400">{r.stop_loss ? formatPrice(r.stop_loss) : "—"}</p></div>
            <div><p className="text-gray-500">TP2 (DOL)</p><p className="font-bold tabular-nums text-green-400">{r.tp2_price ? formatPrice(r.tp2_price) : "—"}</p></div>
            <div><p className="text-gray-500">RR @ TP2</p><p className={`font-bold tabular-nums ${r.rr_tp2 >= 2 ? "text-green-300" : "text-yellow-300"}`}>{r.rr_tp2 ? `1:${r.rr_tp2.toFixed(2)}` : "—"}</p></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">📓 TS Journal</h1>
            <p className="text-gray-400 text-sm">All Time-Slice setups.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={loadRows} className="text-xs px-3 py-2 rounded-lg bg-gray-800 text-gray-300 font-semibold">🔄 Refresh</button>
            <button type="button" onClick={() => router.push("/ts")} className="text-xs px-3 py-2 rounded-lg bg-violet-900/40 text-violet-300 font-semibold">+ New TS</button>
          </div>
        </div>

        {/* Stats */}
        {!loading && rows.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold">{stats.total}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-yellow-800/60 text-center">
              <p className="text-xs text-gray-500">📝 Drafts</p>
              <p className="text-lg font-bold text-yellow-300">{stats.draftsCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-blue-900/60 text-center">
              <p className="text-xs text-gray-500">🎯 Active</p>
              <p className="text-lg font-bold text-blue-300">{stats.active}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-green-900/60 text-center">
              <p className="text-xs text-gray-500">✅ Won</p>
              <p className="text-lg font-bold text-green-300">{stats.wins}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-red-900/60 text-center">
              <p className="text-xs text-gray-500">🔴 Lost</p>
              <p className="text-lg font-bold text-red-300">{stats.losses}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-violet-800/60 text-center">
              <p className="text-xs text-gray-500">📊 Win Rate</p>
              <p className="text-lg font-bold text-violet-300">{stats.winRate}%</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-violet-400">Filters</h2>
          <div>
            <label className="block text-xs mb-1 text-gray-400">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pair or notes..."
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">D1 Bias</label>
              <select value={filterBias} onChange={(e) => setFilterBias(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                <option value="all">All biases</option>
                <option value="bullish">🟢 Bullish</option>
                <option value="bearish">🔴 Bearish</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Trade Result</label>
              <select value={filterResult} onChange={(e) => setFilterResult(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                <option value="all">All results</option>
                <option value="none">— Untagged</option>
                <option value="active">🎯 Active</option>
                <option value="won">✅ Won</option>
                <option value="lost">🔴 Lost</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-500">Showing {filtered.length} of {rows.length}</p>
        </div>

        {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}
        {loading && <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>}

        {!loading && rows.length === 0 && (
          <div className="p-6 rounded-lg bg-violet-950/30 border border-violet-900/50 text-center space-y-3">
            <p className="text-sm text-violet-200">No Time-Slice setups yet.</p>
            <button type="button" onClick={() => router.push("/ts")} className="px-4 py-2 rounded-lg bg-violet-800 font-bold text-sm">Start your first TS</button>
          </div>
        )}

        {!loading && drafts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-yellow-800/60" />
              <p className="text-xs font-bold text-yellow-300 uppercase tracking-wider">📝 Drafts ({drafts.length})</p>
              <div className="flex-1 h-px bg-yellow-800/60" />
            </div>
            {drafts.map((r) => renderRow(r, true))}
          </div>
        )}

        {!loading && complete.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-800" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">✅ Complete ({complete.length})</p>
              <div className="flex-1 h-px bg-gray-800" />
            </div>
            {complete.map((r) => renderRow(r, false))}
          </div>
        )}
      </div>
    </main>
  );
}