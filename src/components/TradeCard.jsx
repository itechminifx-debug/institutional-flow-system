"use client";

import { formatPrice } from "@/lib/formatNumbers";

// ============================================================
// SHARED TRADE CARD
// ============================================================
// Renders the complete trade parameters for any system:
//   - Direction badge
//   - Entry (CE)
//   - Stop Loss
//   - Take Profit (2R)
//   - RR
//   - SL / TP distance in pips
//   - Lot size
//   - Risk ($)
//   - Optional badges (path danger, alignment, etc.)
//
// Props:
//   trade: {
//     direction, entry, sl, tp, rr,
//     lotSize, riskAmount, risk,
//     slPips, tpPips, pipSize, slSource
//   }
//   badges: array of { label, className } — optional top-right badges
//   showPips: boolean (default true)
//   title: string (default "Trade Parameters")
// ============================================================

export default function TradeCard({
  trade,
  badges = [],
  showPips = true,
  title = "Trade Parameters",
}) {
  if (!trade) return null;

  const isBull = trade.direction === "BUY";

  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-blue-800 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-blue-400">{title}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {badges.map((b, i) => (
            <span
              key={i}
              className={`text-xs px-2 py-1 rounded-full font-semibold ${b.className}`}
            >
              {b.label}
            </span>
          ))}
          <span
            className={`text-xs px-2 py-1 rounded-full font-bold ${
              isBull
                ? "bg-green-900/40 text-green-300"
                : "bg-red-900/40 text-red-300"
            }`}
          >
            {trade.direction}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-500">Entry (CE)</p>
          <p className="font-bold tabular-nums text-yellow-400">
            {formatPrice(trade.entry)}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Stop Loss</p>
          <p className="font-bold tabular-nums text-red-400">
            {formatPrice(trade.sl)}
          </p>
          {trade.slSource && (
            <p className="text-xs text-gray-500 mt-0.5">
              {trade.slSource === "reference+buffer"
                ? "ref + buffer"
                : trade.slSource === "wick+buffer"
                ? "wick + buffer"
                : "wick only"}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs text-gray-500">
            Take Profit ({(trade.rr || 2).toFixed?.(0) || trade.rr}R)
          </p>
          <p className="font-bold tabular-nums text-green-400">
            {formatPrice(trade.tp)}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">RR</p>
          <p className="font-bold tabular-nums text-white">
            1:{trade.rr || 2}
          </p>
        </div>

        {showPips && (
          <>
            {trade.slPips !== undefined && (
              <div>
                <p className="text-xs text-gray-500">SL distance</p>
                <p className="font-bold tabular-nums text-red-300">
                  {trade.slPips} pips
                </p>
              </div>
            )}

            {trade.tpPips !== undefined && (
              <div>
                <p className="text-xs text-gray-500">TP distance</p>
                <p className="font-bold tabular-nums text-green-300">
                  {trade.tpPips} pips
                </p>
              </div>
            )}

            {trade.pipSize !== undefined && (
              <div>
                <p className="text-xs text-gray-500">Pip size</p>
                <p className="font-bold tabular-nums text-gray-300">
                  {trade.pipSize}
                </p>
              </div>
            )}
          </>
        )}

        {trade.lotSize !== undefined && trade.lotSize > 0 && (
          <div>
            <p className="text-xs text-gray-500">Lot Size</p>
            <p className="font-bold tabular-nums text-white">
              {Number(trade.lotSize).toFixed(2)}
            </p>
          </div>
        )}

        {trade.riskAmount !== undefined && trade.riskAmount > 0 && (
          <div>
            <p className="text-xs text-gray-500">Risk ($)</p>
            <p className="font-bold tabular-nums text-yellow-400">
              ${Number(trade.riskAmount).toFixed(2)}
            </p>
          </div>
        )}

        {trade.risk !== undefined && (
          <div>
            <p className="text-xs text-gray-500">Risk (units)</p>
            <p className="font-bold tabular-nums text-white">
              {Number(trade.risk).toFixed(2)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}