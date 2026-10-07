"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";

const SYSTEM_LABELS = {
  negotiation: "Negotiation",
  bos_rb: "BOS + RB",
  premium_discount: "Prem/Disc",
  liquidity_zone: "Liquidity Zone",
  rejection_block: "Rejection Block",
  manual: "Manual",
};

const SYSTEM_COLORS = {
  negotiation: "bg-blue-900/40 text-blue-300",
  bos_rb: "bg-purple-900/40 text-purple-300",
  premium_discount: "bg-yellow-900/40 text-yellow-300",
  liquidity_zone: "bg-orange-900/40 text-orange-300",
  rejection_block: "bg-pink-900/40 text-pink-300",
  manual: "bg-gray-800 text-gray-300",
};

const SYSTEM_PATHS = {
  negotiation: "/negotiation",
  bos_rb: "/bos-rb",
  premium_discount: "/premium-discount",
  liquidity_zone: "/liquidity-zone",
  rejection_block: "/rejection-block",
};

export default function SetupsListPage() {
  const supabase = createClient();
  const [setups, setSetups] = useState([]);
  const [visitCounts, setVisitCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterSystem, setFilterSystem] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPair, setFilterPair] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("setups")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setSetups(data || []);

      // Fetch visit counts for rejection_block setups
      const rbIds = (data || [])
        .filter((s) => s.setup_type === "rejection_block")
        .map((s) => s.id);

      if (rbIds.length > 0) {
        const { data: visits } = await supabase
          .from("rejection_block_visits")
          .select("setup_id")
          .in("setup_id", rbIds);

        const counts = {};
        (visits || []).forEach((v) => {
          counts[v.setup_id] = (counts[v.setup_id] || 0) + 1;
        });
        setVisitCounts(counts);
      }

      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uniquePairs = useMemo(() => {
    const s = new Set();
    setups.forEach((x) => x.pair && s.add(x.pair));
    return Array.from(s).sort();
  }, [setups]);

  const filtered = useMemo(() => {
    return setups.filter((s) => {
      if (filterSystem !== "all" && s.setup_type !== filterSystem) return false;
      if (filterStatus === "open" && (s.taken || s.closed)) return false;
      if (filterStatus === "taken" && (!s.taken || s.closed)) return false;
      if (filterStatus === "closed" && !s.closed) return false;
      if (filterPair && s.pair !== filterPair) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${s.pair || ""} ${s.notes || ""} ${s.setup_type || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [setups, filterSystem, filterStatus, filterPair, search]);

  const stats = useMemo(() => {
    const total = setups.length;
    const open = setups.filter((s) => !s.taken && !s.closed).length;
    const taken = setups.filter((s) => s.taken && !s.closed).length;
    const closed = setups.filter((s) => s.closed).length;
    const wins = setups.filter((s) => s.outcome === "win").length;
    const losses = setups.filter((s) => s.outcome === "loss").length;
    const be = setups.filter((s) => s.outcome === "breakeven").length;
    const winRate = closed > 0 ? Math.round((wins / closed) * 100) : null;
    return { total, open, taken, closed, wins, losses, be, winRate };
  }, [setups]);

  function statusBadge(s) {
    if (s.closed) {
      const outcomeColor =
        s.outcome === "win"
          ? "bg-green-900/40 text-green-300 border-green-700"
          : s.outcome === "loss"
          ? "bg-red-900/40 text-red-300 border-red-700"
          : "bg-gray-800 text-gray-300 border-gray-700";
      return { label: "Closed", color: outcomeColor };
    }
    if (s.taken) {
      return {
        label: "Taken",
        color: "bg-blue-900/40 text-blue-300 border-blue-700",
      };
    }
    return {
      label: "Open",
      color: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
    };
  }

  function outcomeBadge(s) {
    if (!s.closed || !s.outcome) return null;
    if (s.outcome === "win")
      return { label: "WIN", color: "bg-green-900/40 text-green-300" };
    if (s.outcome === "loss")
      return { label: "LOSS", color: "bg-red-900/40 text-red-300" };
    return { label: "BE", color: "bg-gray-800 text-gray-300" };
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">My Setups</h1>
          <p className="text-gray-400 text-sm">
            All systems in one place — filter, review, edit
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-xl font-bold tabular-nums">{stats.total}</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-900 border border-yellow-900/50">
            <p className="text-xs text-gray-500">Open</p>
            <p className="text-xl font-bold tabular-nums text-yellow-300">
              {stats.open}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gray-900 border border-blue-900/50">
            <p className="text-xs text-gray-500">Taken</p>
            <p className="text-xl font-bold tabular-nums text-blue-300">
              {stats.taken}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gray-900 border border-green-900/50">
            <p className="text-xs text-gray-500">
              Closed {stats.winRate !== null ? `— ${stats.winRate}% win` : ""}
            </p>
            <p className="text-xl font-bold tabular-nums text-green-300">
              {stats.closed}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.wins}W / {stats.losses}L / {stats.be}BE
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                System
              </label>
              <select
                value={filterSystem}
                onChange={(e) => setFilterSystem(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              >
                <option value="all">All systems</option>
                <option value="negotiation">Negotiation</option>
                <option value="bos_rb">BOS + RB</option>
                <option value="premium_discount">Premium / Discount</option>
                <option value="liquidity_zone">Liquidity Zone</option>
                <option value="rejection_block">Rejection Block</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="taken">Taken</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Pair</label>
              <select
                value={filterPair}
                onChange={(e) => setFilterPair(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              >
                <option value="">All pairs</option>
                {uniquePairs.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Search
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="pair, notes..."
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Showing {filtered.length} of {setups.length}
          </p>
        </div>

        {/* List */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          {loading ? (
            <p className="text-gray-400 text-sm py-6 text-center">
              Loading setups...
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-400 text-sm py-6 text-center">
              No setups match the filters.
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((s) => {
                const status = statusBadge(s);
                const outcome = outcomeBadge(s);
                const sysLabel = SYSTEM_LABELS[s.setup_type] || s.setup_type;
                const sysColor =
                  SYSTEM_COLORS[s.setup_type] || "bg-gray-800 text-gray-300";
                const editPath = SYSTEM_PATHS[s.setup_type]
                  ? `${SYSTEM_PATHS[s.setup_type]}?edit=${s.id}`
                  : null;
                const visits = visitCounts[s.id] || 0;

                return (
                  <div
                    key={s.id}
                    className="p-3 rounded-lg bg-black border border-gray-800 hover:border-gray-600 transition"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Link
                            href={`/setups/${s.id}`}
                            className="font-bold hover:underline truncate"
                          >
                            {s.pair}
                          </Link>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${sysColor}`}
                          >
                            {sysLabel}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${status.color}`}
                          >
                            {status.label}
                          </span>
                          {outcome && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-bold ${outcome.color}`}
                            >
                              {outcome.label}
                            </span>
                          )}
                          {visits > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 font-semibold">
                              📍 {visits} visit{visits === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                          <span>
                            {new Date(s.created_at).toLocaleDateString()}
                          </span>
                          {s.htf_bias && (
                            <span className="capitalize">{s.htf_bias}</span>
                          )}
                          {s.ce_price && (
                            <span className="tabular-nums">
                              CE {formatPrice(s.ce_price)}
                            </span>
                          )}
                        </div>
                        {s.notes && (
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            {s.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {editPath && (
                          <Link
                            href={editPath}
                            className="text-xs px-3 py-1.5 rounded-lg bg-blue-800 hover:bg-blue-700 font-semibold"
                          >
                            ✏️ Edit
                          </Link>
                        )}
                        <Link
                          href={`/setups/${s.id}`}
                          className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 font-semibold"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}