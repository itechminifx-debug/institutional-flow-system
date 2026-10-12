"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import PairPicker from "@/components/PairPicker";
import { AMD_TYPES } from "@/lib/amdEngine";

const STATUS_OPTIONS = [
  { key: "all", label: "All statuses" },
  { key: "draft", label: "📝 Drafts only" },
  { key: "complete", label: "✅ Complete only" },
];

// ------------------------------------------------------------
// Date grouping helpers
// ------------------------------------------------------------
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function groupLabel(isoDate) {
  const d = startOfDay(isoDate);
  const now = startOfDay(new Date());
  const diffDays = Math.round((now - d) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

// For drafts we use updated_at; for complete we use created_at.
function rowDate(r) {
  return r.status === "draft"
    ? r.updated_at || r.created_at
    : r.created_at;
}

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
      key,
      label: groupLabel(key),
      items: items.sort(
        (a, b) => new Date(rowDate(b)) - new Date(rowDate(a))
      ),
    }));
}

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

export default function AmdHistoryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterPair, setFilterPair] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

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
    return rows.filter((r) => {
      if (filterPair && r.pair !== filterPair) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      return true;
    });
  }, [rows, filterPair, filterStatus]);

  const groups = useMemo(() => groupRowsByDay(filtered), [filtered]);

  // Overall stats
  const stats = useMemo(() => {
    const total = rows.length;
    const drafts = rows.filter((r) => r.status === "draft").length;
    const complete = rows.filter((r) => r.status !== "draft").length;
    const buys = rows.filter(
      (r) => r.verdict === "BUY" && r.status !== "draft"
    ).length;
    const sells = rows.filter(
      (r) => r.verdict === "SELL" && r.status !== "draft"
    ).length;
    const bull = rows.filter((r) => r.sequence_type === "bullish").length;
    const bear = rows.filter((r) => r.sequence_type === "bearish").length;
    return { total, drafts, complete, buys, sells, bull, bear };
  }, [rows]);

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">📜 AMD History</h1>
            <p className="text-gray-400 text-sm">
              Every AMD setup, grouped by day — newest first.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => router.push("/amd/journal")}
              className="text-xs px-3 py-2 rounded-lg bg-purple-900/40 text-purple-300 hover:bg-purple-800/40 font-semibold"
            >
              📓 Open Journal
            </button>
            <button
              type="button"
              onClick={() => router.push("/amd")}
              className="text-xs px-3 py-2 rounded-lg bg-blue-900/40 text-blue-300 hover:bg-blue-800/40 font-semibold"
            >
              + New AMD
            </button>
          </div>
        </div>

        {/* Stats */}
        {!loading && rows.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold">{stats.total}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-yellow-800/60 text-center">
              <p className="text-xs text-gray-500">📝 Drafts</p>
              <p className="text-lg font-bold text-yellow-300">
                {stats.drafts}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-green-900/60 text-center">
              <p className="text-xs text-gray-500">🟢 BUY</p>
              <p className="text-lg font-bold text-green-300">
                {stats.buys}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-red-900/60 text-center">
              <p className="text-xs text-gray-500">🔴 SELL</p>
              <p className="text-lg font-bold text-red-300">
                {stats.sells}
              </p>
            </div>
          </div>
        )}

        {/* Filter */}
        {!loading && rows.length > 0 && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-blue-400">Filter</h2>
              {(filterPair || filterStatus !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterPair("");
                    setFilterStatus("all");
                  }}
                  className="text-xs text-blue-300 hover:text-blue-200"
                >
                  Clear filters
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <PairPicker
                value={filterPair}
                onChange={setFilterPair}
                label="Pair (any)"
              />
              <div>
                <label className="block text-xs mb-1 text-gray-400">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Showing {filtered.length} of {rows.length} setups
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="p-6 text-center text-gray-400 text-sm">
            Loading history...
          </div>
        )}

        {/* Empty */}
        {!loading && rows.length === 0 && (
          <div className="p-6 rounded-lg bg-blue-950/30 border border-blue-900/50 text-center space-y-3">
            <p className="text-sm text-blue-200">
              No AMD history yet — nothing has been saved.
            </p>
            <button
              type="button"
              onClick={() => router.push("/amd")}
              className="px-4 py-2 rounded-lg bg-blue-800 hover:bg-blue-700 font-bold text-sm"
            >
              Create your first AMD setup
            </button>
          </div>
        )}

        {/* No matches */}
        {!loading && rows.length > 0 && filtered.length === 0 && (
          <div className="p-6 text-center text-gray-400 text-sm">
            No AMD setups match the current filters.
          </div>
        )}

        {/* Grouped timeline */}
        {!loading && groups.length > 0 && (
          <div className="space-y-5">
            {groups.map((g) => (
              <div key={g.key} className="space-y-2">
                {/* Date header */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-800" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {g.label}
                  </p>
                  <div className="flex-1 h-px bg-gray-800" />
                </div>

                {/* Rows */}
                {g.items.map((r) => {
                  const isDraft = r.status === "draft";
                  const badge = verdictBadge(r.verdict);
                  const typeInfo = AMD_TYPES.find(
                    (t) => t.key === r.sequence_type
                  );
                  const time = new Date(rowDate(r)).toLocaleTimeString(
                    undefined,
                    { hour: "2-digit", minute: "2-digit" }
                  );

                  return (
                    <div
                      key={r.id}
                      onClick={() => router.push(`/amd/${r.id}`)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        isDraft
                          ? "bg-yellow-950/20 border-yellow-800/60 hover:border-yellow-600"
                          : "bg-gray-900 border-gray-800 hover:border-blue-700"
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500 tabular-nums">
                            {time}
                          </span>
                          {isDraft && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 border border-yellow-700 text-yellow-200 font-bold">
                              📝 DRAFT
                            </span>
                          )}
                          <span className="text-sm font-bold">
                            {r.pair}
                          </span>
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
                          {!isDraft && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border font-bold ${badge.cls}`}
                            >
                              {badge.label}
                            </span>
                          )}
                          {r.checklist_score !== null && (
                            <span
                              className={`text-xs ${
                                isDraft
                                  ? "text-yellow-300"
                                  : "text-gray-500"
                              }`}
                            >
                              · {r.checklist_score}/10
                            </span>
                          )}
                        </div>
                      </div>

                      {isDraft ? (
                        <p className="text-xs text-yellow-300/80 mt-2">
                          Not yet complete — open to continue
                        </p>
                      ) : (
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