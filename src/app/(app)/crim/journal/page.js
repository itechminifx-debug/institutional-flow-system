"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";

function relativeTime(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

function resultBadge(result) {
  const map = {
    active: { label: "🎯 Active", cls: "bg-blue-900/40 border-blue-700 text-blue-200" },
    won:    { label: "✅ Won",    cls: "bg-green-900/40 border-green-700 text-green-200" },
    lost:   { label: "🔴 Lost",   cls: "bg-red-900/40 border-red-700 text-red-200" },
  };
  return map[result] || null;
}

export default function CrimJournalPage() {
  const router = useRouter();
  const supabase = createClient();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterResult, setFilterResult] = useState("all");
  const [filterDir, setFilterDir] = useState("all");
  const [deletingId, setDeletingId] = useState(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    const { data, error: loadErr } = await supabase
      .from("crim_setups")
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
      if (filterResult !== "all") {
        if (filterResult === "none" && r.trade_result) return false;
        if (filterResult !== "none" && r.trade_result !== filterResult) return false;
      }
      if (filterDir !== "all" && r.direction !== filterDir) return false;
      return true;
    });
  }, [rows, search, filterResult, filterDir]);

  const drafts = useMemo(
    () => filtered
      .filter((r) => r.status === "draft")
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)),
    [filtered]
  );
  const complete = useMemo(
    () => filtered
      .filter((r) => r.status !== "draft")
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [filtered]
  );

  const stats = useMemo(() => {
    const total = rows.length;
    const draftsCount = rows.filter((r) => r.status === "draft").length;
    const wins = rows.filter((r) => r.trade_result === "won").length;
    const losses = rows.filter((r) => r.trade_result === "lost").length;
    const active = rows.filter((r) => r.trade_result === "active").length;
    return { total, draftsCount, wins, losses, active };
  }, [rows]);

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm("Delete this CRIM setup?")) return;
    setDeletingId(id);
    const { error: delErr } = await supabase.from("crim_setups").delete().eq("id", id);
    if (delErr) { setError(delErr.message); setDeletingId(null); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
  }

  function renderRow(r, isDraft) {
    const badge = resultBadge(r.trade_result);
    const isBull = r.direction === "bullish";

    return (
      <div
        key={r.id}
        onClick={() => router.push(`/crim/${r.id}`)}
        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
          isDraft
            ? "bg-yellow-950/20 border-yellow-800/60 hover:border-yellow-600"
            : "bg-gray-900 border-gray-800 hover:border-sky-700"
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {isDraft && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 border border-yellow-700 text-yellow-200 font-bold">📝 DRAFT</span>
            )}
            <span className="text-sm font-bold">{r.pair || "—"}</span>
            <span className="text-xs text-gray-500">· {r.timeframe?.toUpperCase() || "—"}</span>
            <span className="text-xs text-gray-500">· {r.session?.toUpperCase() || "—"}</span>
            <span className="text-xs text-gray-400">· {isBull ? "🟢 Bull" : "🔴 Bear"}</span>
            {!isDraft && badge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${badge.cls}`}>{badge.label}</span>
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
            <div><p className="text-gray-500">TP</p><p className="font-bold tabular-nums text-green-400">{r.take_profit ? formatPrice(r.take_profit) : "—"}</p></div>
            <div><p className="text-gray-500">Result</p><p className="font-bold uppercase">{r.trade_result || "—"}</p></div>
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
            <h1 className="text-2xl font-bold">📓 CRIM Journal</h1>
            <p className="text-gray-400 text-sm">All CRT + IDM + MSS setups — drafts and complete.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={loadRows} className="text-xs px-3 py-2 rounded-lg bg-gray-800 text-gray-300 font-semibold">🔄 Refresh</button>
            <button type="button" onClick={() => router.push("/crim")} className="text-xs px-3 py-2 rounded-lg bg-sky-900/40 text-sky-300 font-semibold">+ New CRIM</button>
          </div>
        </div>

        {!loading && rows.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
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
          </div>
        )}

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-sky-400">Filters</h2>
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
              <label className="block text-xs mb-1 text-gray-400">Direction</label>
              <select value={filterDir} onChange={(e) => setFilterDir(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                <option value="all">All directions</option>
                <option value="bullish">🟢 Bullish</option>
                <option value="bearish">🔴 Bearish</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Trade Result</label>
              <select value={filterResult} onChange={(e) => setFilterResult(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                <option value="all">All results</option>
                <option value="none">— Untagged (no result)</option>
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
          <div className="p-6 rounded-lg bg-sky-950/30 border border-sky-900/50 text-center space-y-3">
            <p className="text-sm text-sky-200">No CRIM setups yet.</p>
            <button type="button" onClick={() => router.push("/crim")} className="px-4 py-2 rounded-lg bg-sky-800 font-bold text-sm">Start your first CRIM setup</button>
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