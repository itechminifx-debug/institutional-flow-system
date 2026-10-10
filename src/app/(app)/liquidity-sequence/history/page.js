"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import PairPicker from "@/components/PairPicker";
import { SEQUENCE_TYPES } from "@/lib/liquiditySequenceEngine";

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

// Count how many of the 6 gates passed
function countGates(row) {
  const steps = row.steps_passed;
  if (!steps || typeof steps !== "object") return null;
  const keys = ["liquidity", "sweep", "mss", "fvg", "rb", "close"];
  const present = keys.filter((k) => k in steps);
  if (present.length === 0) return null;
  const passed = present.filter((k) => steps[k]).length;
  return { passed, total: present.length };
}

export default function LiquiditySequenceHistoryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterPair, setFilterPair] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterVerdict, setFilterVerdict] = useState("all");

  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error: loadErr } = await supabase
        .from("liquidity_sequence_setups")
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
    return rows.filter((r) => {
      if (filterPair && r.pair !== filterPair) return false;
      if (filterType !== "all" && r.sequence_type !== filterType) return false;
      if (filterVerdict !== "all" && r.verdict !== filterVerdict) return false;
      return true;
    });
  }, [rows, filterPair, filterType, filterVerdict]);

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm("Delete this sequence? This cannot be undone.")) return;

    setDeletingId(id);
    const { error: delErr } = await supabase
      .from("liquidity_sequence_setups")
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

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Sequence History</h1>
            <p className="text-gray-400 text-sm">
              All saved liquidity sequences — the 5-system flow.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/liquidity-sequence")}
            className="text-xs px-3 py-2 rounded-lg bg-blue-900/40 text-blue-300 hover:bg-blue-800/40 font-semibold"
          >
            + New Sequence
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <PairPicker
              value={filterPair}
              onChange={setFilterPair}
              label="Pair (any)"
            />
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Sequence Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              >
                <option value="all">All types</option>
                {SEQUENCE_TYPES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.emoji} {s.label}
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
              filterVerdict !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setFilterPair("");
                  setFilterType("all");
                  setFilterVerdict("all");
                }}
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
            Loading...
          </div>
        )}

        {/* Empty state */}
        {!loading && rows.length === 0 && (
          <div className="p-6 rounded-lg bg-blue-950/30 border border-blue-900/50 text-center space-y-3">
            <p className="text-sm text-blue-200">No saved sequences yet.</p>
            <button
              type="button"
              onClick={() => router.push("/liquidity-sequence")}
              className="px-4 py-2 rounded-lg bg-blue-800 hover:bg-blue-700 font-bold text-sm"
            >
              Create your first sequence
            </button>
          </div>
        )}

        {/* No matches after filters */}
        {!loading && rows.length > 0 && filtered.length === 0 && (
          <div className="p-6 text-center text-gray-400 text-sm">
            No sequences match the current filters.
          </div>
        )}

        {/* Row list */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((r) => {
              const badge = verdictBadge(r.verdict);
              const seqInfo = SEQUENCE_TYPES.find(
                (s) => s.key === r.sequence_type
              );
              const gates = countGates(r);
              const isLegacy = !r.liquidity_zone_high && !r.rb_high;

              return (
                <div
                  key={r.id}
                  onClick={() =>
                    router.push(`/liquidity-sequence/${r.id}`)
                  }
                  className="p-3 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-700 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold">{r.pair}</span>
                      <span className="text-xs text-gray-500">
                        · {r.timeframe}
                      </span>
                      {seqInfo && (
                        <span className="text-xs text-gray-400">
                          · {seqInfo.emoji}{" "}
                          {r.sequence_type === "support"
                            ? "Support"
                            : "Resistance"}
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-bold ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      {gates && (
                        <span className="text-xs text-gray-500">
                          {gates.passed}/{gates.total} gates
                        </span>
                      )}
                      {isLegacy && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-950/60 border border-yellow-700 text-yellow-200">
                          legacy
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