"use client";

import { useState, useEffect, useMemo } from "react";
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

export default function SmcJournalPage() {
  const router = useRouter();
  const supabase = createClient();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error: loadErr } = await supabase.from("smc_setups").select("*").order("created_at", { ascending: false });
      if (loadErr) { setError(loadErr.message); setLoading(false); return; }
      setRows(data || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const hay = `${r.pair || ""} ${r.notes || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search]);

  const drafts = useMemo(() => filtered.filter((r) => r.status === "draft"), [filtered]);
  const complete = useMemo(() => filtered.filter((r) => r.status !== "draft"), [filtered]);

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm("Delete this SMC setup?")) return;
    setDeletingId(id);
    const { error: delErr } = await supabase.from("smc_setups").delete().eq("id", id);
    if (delErr) { setError(delErr.message); setDeletingId(null); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
  }

  function renderRow(r, isDraft) {
    return (
      <div key={r.id} onClick={() => router.push(`/smc/${r.id}`)} className={`p-3 rounded-lg border cursor-pointer transition-colors ${isDraft ? "bg-yellow-950/20 border-yellow-800/60 hover:border-yellow-600" : "bg-gray-900 border-gray-800 hover:border-blue-700"}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {isDraft && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 border border-yellow-700 text-yellow-200 font-bold">📝 DRAFT</span>}
            <span className="text-sm font-bold">{r.pair}</span>
            <span className="text-xs text-gray-500">· {r.timeframe}</span>
            <span className="text-xs text-gray-400">· {r.daily_bias === "bullish" ? "🟢 Bull" : "🔴 Bear"}</span>
            {!isDraft && <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${r.session === "london" || r.session === "ny_am" ? "bg-blue-900/40 border-blue-700 text-blue-200" : "bg-gray-800 border-gray-700 text-gray-400"}`}>{r.session?.toUpperCase()}</span>}
          </div>
          <button type="button" onClick={(e) => handleDelete(r.id, e)} disabled={deletingId === r.id} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">{deletingId === r.id ? "..." : "✕"}</button>
        </div>

        {isDraft ? (
          <p className="text-xs text-yellow-300/80 mt-2">Last saved {relativeTime(r.updated_at || r.created_at)}</p>
        ) : (
          <div className="grid grid-cols-4 gap-3 mt-2 text-xs">
            <div><p className="text-gray-500">Entry</p><p className="font-bold tabular-nums text-yellow-400">{r.entry ? formatPrice(r.entry) : "—"}</p></div>
            <div><p className="text-gray-500">SL</p><p className="font-bold tabular-nums text-red-400">{r.sl ? formatPrice(r.sl) : "—"}</p></div>
            <div><p className="text-gray-500">TP (DOL)</p><p className="font-bold tabular-nums text-green-400">{r.tp ? formatPrice(r.tp) : "—"}</p></div>
            <div><p className="text-gray-500">RR</p><p className={`font-bold tabular-nums ${r.rr >= 3 ? "text-green-300" : "text-yellow-300"}`}>{r.rr ? `1:${r.rr.toFixed(2)}` : "—"}</p></div>
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
            <h1 className="text-2xl font-bold">📓 SMC Journal</h1>
            <p className="text-gray-400 text-sm">All SMC setups — context, liquidity, arrays, delivery.</p>
          </div>
          <button type="button" onClick={() => router.push("/smc")} className="text-xs px-3 py-2 rounded-lg bg-blue-900/40 text-blue-300 font-semibold">+ New SMC</button>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">Filters</h2>
          <div>
            <label className="block text-xs mb-1 text-gray-400">Search</label>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pair or notes..." className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
          </div>
          <p className="text-xs text-gray-500">Showing {filtered.length} of {rows.length}</p>
        </div>

        {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}
        {loading && <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>}

        {!loading && rows.length === 0 && (
          <div className="p-6 rounded-lg bg-blue-950/30 border border-blue-900/50 text-center space-y-3">
            <p className="text-sm text-blue-200">No SMC setups yet.</p>
            <button type="button" onClick={() => router.push("/smc")} className="px-4 py-2 rounded-lg bg-blue-800 font-bold text-sm">Start your first SMC setup</button>
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