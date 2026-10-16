"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import PairPicker from "@/components/PairPicker";
import { SLD_TYPES } from "@/lib/sldEngine";

const STATUS_OPTIONS = [
  { key: "all", label: "All" },
  { key: "draft", label: "📝 Drafts" },
  { key: "complete", label: "✅ Complete" },
];

const TRADE_STATUS_OPTIONS = [
  { key: "all", label: "All trade states" },
  { key: "pending", label: "⏳ Pending" },
  { key: "active", label: "🎯 Active" },
  { key: "partial", label: "⚡ Partial" },
  { key: "closed_win", label: "✅ Won" },
  { key: "closed_loss", label: "🔴 Lost" },
  { key: "invalidated", label: "⚠️ Invalidated" },
];

function statusBadge(status) {
  const map = {
    pending: { cls: "bg-yellow-900/40 border-yellow-700 text-yellow-200", label: "⏳ Pending" },
    active: { cls: "bg-green-900/40 border-green-700 text-green-200", label: "🎯 Active" },
    partial: { cls: "bg-cyan-900/40 border-cyan-700 text-cyan-200", label: "⚡ Partial" },
    closed_win: { cls: "bg-green-900/40 border-green-600 text-green-200", label: "✅ Won" },
    closed_loss: { cls: "bg-red-900/40 border-red-700 text-red-200", label: "🔴 Lost" },
    invalidated: { cls: "bg-gray-900/60 border-gray-600 text-gray-300", label: "⚠️ Invalidated" },
  };
  return map[status] || map.pending;
}

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

export default function SldJournalPage() {
  const router = useRouter();
  const supabase = createClient();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterPair, setFilterPair] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTradeStatus, setFilterTradeStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error: loadErr } = await supabase.from("sld_setups").select("*").order("created_at", { ascending: false });
      if (loadErr) { setError(loadErr.message); setLoading(false); return; }
      setRows(data || []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterPair && r.pair !== filterPair) return false;
      if (filterType !== "all" && r.sequence_type !== filterType) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterTradeStatus !== "all" && r.trade_status !== filterTradeStatus) return false;
      if (q) {
        const hay = `${r.pair || ""} ${r.notes || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filterPair, filterType, filterStatus, filterTradeStatus, search]);

  const drafts = useMemo(() => filtered.filter((r) => r.status === "draft"), [filtered]);
  const complete = useMemo(() => filtered.filter((r) => r.status !== "draft"), [filtered]);

  const stats = useMemo(() => {
    const total = rows.length;
    const draftsCount = rows.filter((r) => r.status === "draft").length;
    const wins = rows.filter((r) => r.trade_status === "closed_win").length;
    const losses = rows.filter((r) => r.trade_status === "closed_loss").length;
    return { total, draftsCount, wins, losses };
  }, [rows]);

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm("Delete this SLD setup?")) return;
    setDeletingId(id);
    const { error: delErr } = await supabase.from("sld_setups").delete().eq("id", id);
    if (delErr) { setError(delErr.message); setDeletingId(null); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
  }

  function renderRow(r, isDraft) {
    const badge = statusBadge(r.trade_status);
    const typeInfo = SLD_TYPES.find((t) => t.key === r.sequence_type);
    const hasNotes = r.notes && r.notes.trim().length > 0;

    return (
      <div key={r.id} onClick={() => router.push(`/sld/${r.id}`)}
        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
          isDraft ? "bg-yellow-950/20 border-yellow-800/60 hover:border-yellow-600"
                  : "bg-gray-900 border-gray-800 hover:border-emerald-700"}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {isDraft && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 border border-yellow-700 text-yellow-200 font-bold">📝 DRAFT</span>
            )}
            <span className="text-sm font-bold">{r.pair}</span>
            <span className="text-xs text-gray-500">· {r.timeframe}</span>
            {typeInfo && (
              <span className="text-xs text-gray-400">· {typeInfo.emoji} {r.sequence_type === "bullish" ? "Bullish" : "Bearish"}</span>
            )}
            {!isDraft && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${badge.cls}`}>{badge.label}</span>
            )}
            {hasNotes && <span className="text-xs text-purple-300">📓</span>}
          </div>
          <button type="button" onClick={(e) => handleDelete(r.id, e)} disabled={deletingId === r.id}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">
            {deletingId === r.id ? "..." : "✕"}
          </button>
        </div>

        {isDraft ? (
          <p className="text-xs text-yellow-300/80 mt-2">
            Last saved {relativeTime(r.updated_at || r.created_at)}
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-3 mt-2 text-xs">
            <div>
              <p className="text-gray-500">Entry</p>
              <p className="font-bold tabular-nums text-yellow-400">{r.entry ? formatPrice(r.entry) : "—"}</p>
            </div>
            <div>
              <p className="text-gray-500">SL</p>
              <p className="font-bold tabular-nums text-red-400">{r.sl ? formatPrice(r.sl) : "—"}</p>
            </div>
            <div>
              <p className="text-gray-500">TP (DOL)</p>
              <p className="font-bold tabular-nums text-green-400">{r.tp ? formatPrice(r.tp) : "—"}</p>
            </div>
            <div>
              <p className="text-gray-500">RR</p>
              <p className={`font-bold tabular-nums ${r.rr >= 3 ? "text-green-300" : "text-yellow-300"}`}>
                {r.rr ? `1:${r.rr.toFixed(2)}` : "—"}
              </p>
            </div>
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
            <h1 className="text-2xl font-bold">📓 SLD Journal</h1>
            <p className="text-gray-400 text-sm">Every SLD workflow — bias, DOL, POI, management, updates.</p>
          </div>
          <button type="button" onClick={() => router.push("/sld")}
            className="text-xs px-3 py-2 rounded-lg bg-emerald-900/40 text-emerald-300 font-semibold">
            + New SLD
          </button>
        </div>

        {!loading && rows.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold">{stats.total}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-yellow-800/60 text-center">
              <p className="text-xs text-gray-500">📝 Drafts</p>
              <p className="text-lg font-bold text-yellow-300">{stats.draftsCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-green-900/60 text-center">
              <p className="text-xs text-gray-500">✅ Wins</p>
              <p className="text-lg font-bold text-green-300">{stats.wins}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-red-900/60 text-center">
              <p className="text-xs text-gray-500">🔴 Losses</p>
              <p className="text-lg font-bold text-red-300">{stats.losses}</p>
            </div>
          </div>
        )}

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-400">Filters</h2>

          <div>
            <label className="block text-xs mb-1 text-gray-400">Search</label>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Pair or notes..." className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <PairPicker value={filterPair} onChange={setFilterPair} label="Pair (any)" />
            <div>
              <label className="block text-xs mb-1 text-gray-400">Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {STATUS_OPTIONS.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Type</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                <option value="all">All types</option>
                {SLD_TYPES.map((t) => (<option key={t.key} value={t.key}>{t.emoji} {t.label}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Trade State</label>
              <select value={filterTradeStatus} onChange={(e) => setFilterTradeStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {TRADE_STATUS_OPTIONS.map((o) => (<option key={o.key} value={o.key}>{o.label}</option>))}
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-500">Showing {filtered.length} of {rows.length}</p>
        </div>

        {error && (<div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>)}
        {loading && (<div className="p-6 text-center text-gray-400 text-sm">Loading...</div>)}

        {!loading && rows.length === 0 && (
          <div className="p-6 rounded-lg bg-emerald-950/30 border border-emerald-900/50 text-center space-y-3">
            <p className="text-sm text-emerald-200">No SLD setups yet.</p>
            <button type="button" onClick={() => router.push("/sld")}
              className="px-4 py-2 rounded-lg bg-emerald-800 font-bold text-sm">Start your first SLD</button>
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