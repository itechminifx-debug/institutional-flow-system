"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import PairPicker from "@/components/PairPicker";
import { AMD_TYPES } from "@/lib/amdEngine";

const VERDICT_OPTIONS = [
  { key: "all", label: "All verdicts" },
  { key: "BUY", label: "🟢 BUY" },
  { key: "SELL", label: "🔴 SELL" },
  { key: "WAIT", label: "⏳ WAIT" },
];

function verdictBadge(verdict) {
  if (verdict === "BUY") {
    return {
      cls: "bg-green-900/40 border-green-700 text-green-200",
      label: "🟢 BUY",
    };
  }
  if (verdict === "SELL") {
    return {
      cls: "bg-red-900/40 border-red-700 text-red-200",
      label: "🔴 SELL",
    };
  }
  return {
    cls: "bg-gray-800/60 border-gray-600 text-gray-300",
    label: "⏳ WAIT",
  };
}

export default function AmdJournalPage() {
  const router = useRouter();
  const supabase = createClient();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [filterPair, setFilterPair] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterVerdict, setFilterVerdict] = useState("all");

  // Search (notes + pair)
  const [search, setSearch] = useState("");

  // Delete
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error: loadErr } = await supabase
        .from("amd_setups")
        .select("*")
        .order("created_at", { ascending: false });

      if (loadErr) {
        setError(loadErr.message);
        setLoading(false);
        return;
      }
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
      if (filterVerdict !== "all" && r.verdict !== filterVerdict) return false;
      if (q) {
        const hay = `${r.pair || ""} ${r.notes || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filterPair, filterType, filterVerdict, search]);

  // Stats summary
  const stats = useMemo(() => {
    const total = rows.length;
    const buys = rows.filter((r) => r.verdict === "BUY").length;
    const sells = rows.filter((r) => r.verdict === "SELL").length;
    const waits = rows.filter((r) => r.verdict === "WAIT").length;
    return { total, buys, sells, waits };
  }, [rows]);

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm("Delete this AMD setup? This cannot be undone.")) return;

    setDeletingId(id);
    const { error: delErr } = await supabase
      .from("amd_setups")
      .delete()
      .eq("id", id);

    if (delErr) {
      setError(delErr.message);
      setDeletingId(null);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
  }

  function clearFilters() {
    setFilterPair("");
    setFilterType("all");
    setFilterVerdict("all");
    setSearch("");
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">📓 AMD Journal</h1>
            <p className="text-gray-400 text-sm">
              Every AMD setup — with notes, outcome, and lessons.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/amd")}
            className="text-xs px-3 py-2 rounded-lg bg-blue-900/40 text-blue-300 hover:bg-blue-800/40 font-semibold"
          >
            + New AMD Setup
          </button>
        </div>

        {/* Stats */}
        {!loading && rows.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold">{stats.total}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-green-900/60 text-center">
              <p className="text-xs text-gray-500">BUY</p>
              <p className="text-lg font-bold text-green-300">
                {stats.buys}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-red-900/60 text-center">
              <p className="text-xs text-gray-500">SELL</p>
              <p className="text-lg font-bold text-red-300">{stats.sells}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-yellow-900/60 text-center">
              <p className="text-xs text-gray-500">WAIT</p>
              <p className="text-lg font-bold text-yellow-300">
                {stats.waits}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">Filters</h2>

          {/* Search */}
          <div>
            <label className="block text-xs mb-1 text-gray-400">
              Search (pair or notes)
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. Volatility, or a word from your notes..."
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <PairPicker
              value={filterPair}
              onChange={setFilterPair}
              label="Pair (any)"
            />
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                AMD Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              >
                <option value="all">All types</option>
                {AMD_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.emoji} {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Verdict
              </label>
              <select
                value={filterVerdict}
                onChange={(e) => setFilterVerdict(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              >
                {VERDICT_OPTIONS.map((v) => (
                  <option key={v.key} value={v.key}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-gray-400">
            <span>
              Showing {filtered.length} of {rows.length}
            </span>
            {(filterPair ||
              filterType !== "all" ||
              filterVerdict !== "all" ||
              search) && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-blue-300 hover:text-blue-200"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="p-6 text-center text-gray-400 text-sm">
            Loading journal...
          </div>
        )}

        {/* Empty state */}
        {!loading && rows.length === 0 && (
          <div className="p-6 rounded-lg bg-blue-950/30 border border-blue-900/50 text-center space-y-3">
            <p className="text-sm text-blue-200">
              No AMD setups yet — your journal is empty.
            </p>
            <button
              type="button"
              onClick={() => router.push("/amd")}
              className="px-4 py-2 rounded-lg bg-blue-800 hover:bg-blue-700 font-bold text-sm"
            >
              Log your first AMD setup
            </button>
          </div>
        )}

        {/* No matches */}
        {!loading && rows.length > 0 && filtered.length === 0 && (
          <div className="p-6 text-center text-gray-400 text-sm">
            No AMD setups match the current filters.
          </div>
        )}

        {/* Row list */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((r) => {
              const badge = verdictBadge(r.verdict);
              const typeInfo = AMD_TYPES.find(
                (t) => t.key === r.sequence_type
              );
              const hasNotes = r.notes && r.notes.trim().length > 0;

              return (
                <div
                  key={r.id}
                  onClick={() => router.push(`/amd/${r.id}`)}
                  className="p-3 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-700 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold">{r.pair}</span>
                      <span className="text-xs text-gray-500">
                        · {r.timeframe}
                      </span>
                      {typeInfo && (
                        <span className="text-xs text-gray-400">
                          · {typeInfo.emoji}{" "}
                          {r.sequence_type === "bullish"
                            ? "Bullish"
                            : "Bearish"}
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-bold ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      {r.checklist_score !== null && (
                        <span className="text-xs text-gray-500">
                          · {r.checklist_score}/10
                        </span>
                      )}
                      {hasNotes && (
                        <span className="text-xs text-purple-300">
                          📓 notes
                        </span>
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

                  <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
                    <div>
                      <p className="text-gray-500">Entry</p>
                      <p className="font-bold tabular-nums text-yellow-400">
                        {r.entry ? formatPrice(r.entry) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">SL</p>
                      <p className="font-bold tabular-nums text-red-400">
                        {r.sl ? formatPrice(r.sl) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">TP</p>
                      <p className="font-bold tabular-nums text-green-400">
                        {r.tp ? formatPrice(r.tp) : "—"}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}