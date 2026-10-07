import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/setupHelpers";
import {
  systemLabel,
  systemColor,
  systemEmoji,
} from "@/lib/journalEngine";

export default async function JournalPage({ searchParams }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const highlightId = params?.trade;
  const systemFilter = params?.system || "all";

  // Load trades
  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .order("opened_at", { ascending: false });

  const safeTrades = trades || [];

  // Load linked setups
  const setupIds = safeTrades.map((t) => t.setup_id).filter(Boolean);
  let setupsById = {};
  if (setupIds.length > 0) {
    const { data: setups } = await supabase
      .from("setups")
      .select("id, setup_type, pair, htf_bias, checklist_score, checklist_passed")
      .in("id", setupIds);
    (setups || []).forEach((s) => {
      setupsById[s.id] = s;
    });
  }

  // Attach setup_type to each trade
  const tradesWithSystem = safeTrades.map((t) => ({
    ...t,
    _system: t.setup_id ? setupsById[t.setup_id]?.setup_type : "manual",
    _setup: t.setup_id ? setupsById[t.setup_id] : null,
  }));

  // Filter by system
  const filteredTrades =
    systemFilter === "all"
      ? tradesWithSystem
      : tradesWithSystem.filter((t) => t._system === systemFilter);

  const openTrades = filteredTrades.filter((t) => t.status === "open");
  const closedTrades = filteredTrades.filter((t) => t.status !== "open");

  // Per-system win rate
  const systems = [
    "rejection_block",
    "bos_rb",
    "negotiation",
    "premium_discount",
    "liquidity_zone",
    "manual",
  ];

  const perSystemStats = systems.map((sys) => {
    const all = tradesWithSystem.filter((t) => t._system === sys);
    const closed = all.filter((t) => t.status && t.status !== "open");
    const wins = closed.filter((t) => t.status === "won").length;
    const wr = closed.length > 0 ? Math.round((wins / closed.length) * 100) : null;
    return { system: sys, total: all.length, closed: closed.length, wins, winRate: wr };
  }).filter((s) => s.total > 0);

  // Overall win rate
  const overallClosed = tradesWithSystem.filter(
    (t) => t.status && t.status !== "open"
  );
  const overallWins = overallClosed.filter((t) => t.status === "won").length;
  const overallWinRate =
    overallClosed.length > 0
      ? Math.round((overallWins / overallClosed.length) * 100)
      : null;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Journal</h1>
          <p className="text-gray-400 text-sm">
            Every trade · Every system · One journal
          </p>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
            <p className="text-gray-500 text-xs">Open</p>
            <p className="text-xl font-bold">{openTrades.length}</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
            <p className="text-gray-500 text-xs">Closed</p>
            <p className="text-xl font-bold">{closedTrades.length}</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
            <p className="text-gray-500 text-xs">Win Rate</p>
            <p className="text-xl font-bold">
              {overallWinRate !== null ? `${overallWinRate}%` : "—"}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
            <p className="text-gray-500 text-xs">Systems</p>
            <p className="text-xl font-bold">{perSystemStats.length}</p>
          </div>
        </div>

        {/* Per-system breakdown */}
        {perSystemStats.length > 0 && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 mb-6">
            <h2 className="text-sm font-semibold text-blue-400 mb-3">
              Win rate by system
            </h2>
            <div className="space-y-2">
              {perSystemStats.map((s) => (
                <div
                  key={s.system}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${systemColor(
                        s.system
                      )}`}
                    >
                      {systemEmoji(s.system)} {systemLabel(s.system)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {s.total} trade{s.total === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {s.wins}W / {s.closed - s.wins}L
                    </span>
                    <span
                      className={`font-bold tabular-nums ${
                        s.winRate === null
                          ? "text-gray-500"
                          : s.winRate >= 50
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {s.winRate !== null ? `${s.winRate}%` : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <FilterChip label="All" value="all" active={systemFilter === "all"} />
          {systems.map((sys) => (
            <FilterChip
              key={sys}
              label={`${systemEmoji(sys)} ${systemLabel(sys)}`}
              value={sys}
              active={systemFilter === sys}
            />
          ))}
        </div>

        {/* Open trades */}
        {openTrades.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3 text-green-400">
              Open Trades ({openTrades.length})
            </h2>
            <div className="space-y-3">
              {openTrades.map((t) => (
                <TradeCard
                  key={t.id}
                  trade={t}
                  highlight={t.id === highlightId}
                />
              ))}
            </div>
          </div>
        )}

        {/* Closed trades */}
        {closedTrades.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 text-gray-400">
              Closed Trades ({closedTrades.length})
            </h2>
            <div className="space-y-3">
              {closedTrades.map((t) => (
                <TradeCard
                  key={t.id}
                  trade={t}
                  highlight={t.id === highlightId}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {filteredTrades.length === 0 && (
          <div className="p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-gray-400 mb-4">
              {systemFilter === "all"
                ? "No trades yet."
                : `No trades from ${systemLabel(systemFilter)} yet.`}
            </p>
            <Link
              href="/setups"
              className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
            >
              Go to Setups to start a trade
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

function FilterChip({ label, value, active }) {
  return (
    <Link
      href={value === "all" ? "/journal" : `/journal?system=${value}`}
      className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition ${
        active
          ? "bg-blue-900/40 border-blue-600 text-blue-200"
          : "bg-black border-gray-800 text-gray-400 hover:border-gray-600"
      }`}
    >
      {label}
    </Link>
  );
}

function TradeCard({ trade, highlight }) {
  const statusColors = {
    open: "bg-blue-900/40 text-blue-300",
    won: "bg-green-900/40 text-green-300",
    lost: "bg-red-900/40 text-red-300",
    be: "bg-gray-800 text-gray-300",
  };

  const statusLabels = {
    open: "OPEN",
    won: "WON",
    lost: "LOST",
    be: "BE",
  };

  const sys = trade._system || "manual";

  return (
    <Link
      href={`/journal/${trade.id}`}
      className={`block p-4 rounded-lg bg-gray-900 border transition ${
        highlight
          ? "border-green-500 shadow-lg shadow-green-500/20"
          : "border-gray-800 hover:border-blue-600"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">{trade.pair}</h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${systemColor(
                sys
              )}`}
            >
              {systemEmoji(sys)} {systemLabel(sys)}
            </span>
            {trade.direction && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  trade.direction === "buy"
                    ? "bg-green-900/40 text-green-300"
                    : "bg-red-900/40 text-red-300"
                }`}
              >
                {trade.direction}
              </span>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                statusColors[trade.status] || statusColors.open
              }`}
            >
              {statusLabels[trade.status] || trade.status}
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-1">
            {trade.opened_at ? formatDate(trade.opened_at) : "—"}
          </p>
        </div>
        <span className="text-gray-600 text-xs">Open →</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-gray-500 text-xs">Entry</p>
          <p className="text-gray-200 tabular-nums">
            {trade.entry_price ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">SL</p>
          <p className="text-red-300 tabular-nums">{trade.stop_loss ?? "—"}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">TP</p>
          <p className="text-green-300 tabular-nums">
            {trade.take_profit ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">RR</p>
          <p className="text-gray-200 tabular-nums">
            {trade.rr_ratio ? `1:${trade.rr_ratio}` : "—"}
          </p>
        </div>
      </div>

      {(trade.partial_taken || trade.sl_moved_to_be) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800">
          {trade.partial_taken && (
            <span className="text-xs px-2 py-0.5 rounded bg-yellow-900/40 text-yellow-300">
              Partial @ 1:1
            </span>
          )}
          {trade.sl_moved_to_be && (
            <span className="text-xs px-2 py-0.5 rounded bg-blue-900/40 text-blue-300">
              SL → BE
            </span>
          )}
        </div>
      )}
      {trade.screenshot_urls && trade.screenshot_urls.length > 0 && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-800">
          <span className="text-xs text-gray-500">
            📸 {trade.screenshot_urls.length} screenshot
            {trade.screenshot_urls.length > 1 ? "s" : ""}
          </span>
        </div>
      )}
    </Link>
  );
}