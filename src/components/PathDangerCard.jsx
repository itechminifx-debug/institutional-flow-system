"use client";

import { formatPrice } from "@/lib/formatNumbers";

// ============================================================
// SHARED PATH DANGER CARD
// ============================================================
// Renders all obstacles (zones / RBs) between entry and TP,
// each with a danger tier, score, reason, and distances.
//
// Props:
//   pathInfo: { pathRbs, nearest, safeTp, safeTpPips }
//   pathDanger: { rbs, topScore, topTier, summary }
//   blockerBadge: { emoji, label, color }
//   trade: { tp }
//   zoneLabel: string (default "RBs in the path")
//   zoneShortLabel: string (default "RB")
// ============================================================

export default function PathDangerCard({
  pathInfo,
  pathDanger,
  blockerBadge,
  trade,
  zoneLabel = "RBs in the path",
  zoneShortLabel = "RB",
}) {
  if (!pathInfo || !pathInfo.hasBlockers || !pathDanger) return null;
  if (!pathDanger.rbs || pathDanger.rbs.length === 0) return null;

  return (
    <div className="p-4 rounded-lg bg-gray-900 border-2 border-yellow-700 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-bold text-yellow-300">
          ⚠️ {zoneLabel}
        </h2>
        {blockerBadge && (
          <span
            className={`text-xs px-2 py-1 rounded-full border font-bold ${blockerBadge.color}`}
          >
            {blockerBadge.emoji} {blockerBadge.label}
          </span>
        )}
      </div>

      <p className="text-xs text-yellow-200">{pathDanger.summary}</p>

      <div className="space-y-2">
        {pathDanger.rbs.map((d, i) => (
          <div
            key={d.rbId || i}
            className={`p-3 rounded-lg border ${d.tier.color}`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-bold">
                {d.tier.emoji} {d.tier.label} · {d.score}/10
              </span>
              <span className="text-xs tabular-nums opacity-90">
                {d.rbLow} – {d.rbHigh} (CE {d.ce})
              </span>
            </div>
            <p className="text-xs opacity-80 mt-1">{d.reason}</p>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <p>
                <span className="opacity-70">To entry:</span>{" "}
                <span className="font-bold tabular-nums">
                  {d.distanceToEntryPips} pips
                </span>
              </p>
              <p>
                <span className="opacity-70">To TP:</span>{" "}
                <span className="font-bold tabular-nums">
                  {d.distanceToTpPips} pips
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {pathInfo.safeTp !== null && pathInfo.safeTp !== undefined && (
        <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-800">
          <p className="text-xs text-yellow-200 font-semibold">
            💡 Recommended:
          </p>
          {trade?.tp !== undefined && (
            <p className="text-xs text-yellow-100 mt-1">
              Full 2R target:{" "}
              <strong className="tabular-nums">
                {formatPrice(trade.tp)}
              </strong>
            </p>
          )}
          <p className="text-xs text-yellow-100">
            Safe TP (before nearest {zoneShortLabel}):{" "}
            <strong className="tabular-nums">
              {formatPrice(pathInfo.safeTp)}
            </strong>{" "}
            {pathInfo.safeTpPips !== null &&
              pathInfo.safeTpPips !== undefined && (
                <span className="text-yellow-300">
                  ({pathInfo.safeTpPips} pips)
                </span>
              )}
          </p>
          {pathDanger.topScore >= 8 && (
            <p className="text-xs text-red-300 mt-2 font-bold">
              🚨 Strongly consider the Safe TP — critical zone in path.
            </p>
          )}
        </div>
      )}
    </div>
  );
}