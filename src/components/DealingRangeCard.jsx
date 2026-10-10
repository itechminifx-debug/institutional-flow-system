"use client";

import { formatPrice } from "@/lib/formatNumbers";
import { irlErlAlignmentBadge } from "@/lib/irlErlEngine";

// ============================================================
// SHARED DEALING RANGE CARD
// ============================================================
// Props:
//   data: {
//     range: { dealingHigh, dealingLow, dealingCe, dealingSize },
//     position, positionInfo,
//     irl: { high, low, ce, label },
//     erl: { price, source },
//     aligned, direction
//   }
// ============================================================

export default function DealingRangeCard({ data }) {
  if (!data || !data.range) return null;

  const { range, positionInfo, irl, erl, aligned, direction } = data;
  const alignment = irlErlAlignmentBadge(aligned);

  return (
    <div className="p-4 rounded-lg bg-gray-900 border-2 border-blue-800 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-bold text-blue-300">
          🧭 IRL / ERL — Dealing Range
        </h2>
        {positionInfo && (
          <span
            className={`text-xs px-2 py-1 rounded-full border font-semibold ${positionInfo.color}`}
          >
            {positionInfo.emoji} {positionInfo.label}
          </span>
        )}
      </div>

      {/* Dealing Range */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-xs text-gray-500">Dealing High (ERL ↑)</p>
          <p className="font-bold tabular-nums text-purple-300">
            {formatPrice(range.dealingHigh)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Equilibrium (CE)</p>
          <p className="font-bold tabular-nums text-blue-300">
            {formatPrice(range.dealingCe)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Dealing Low (ERL ↓)</p>
          <p className="font-bold tabular-nums text-orange-300">
            {formatPrice(range.dealingLow)}
          </p>
        </div>
      </div>

      {/* IRL + ERL */}
      <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-gray-800">
        {irl && (
          <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900">
            <p className="text-xs text-blue-300 font-semibold">
              🎯 IRL — {irl.label}
            </p>
            <p className="text-xs text-gray-400 mt-1 tabular-nums">
              {formatPrice(irl.low)} – {formatPrice(irl.high)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              CE {formatPrice(irl.ce)}
            </p>
          </div>
        )}
        {erl && (
          <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-900">
            <p className="text-xs text-purple-300 font-semibold">
              🧲 ERL — Target
            </p>
            <p className="text-sm font-bold tabular-nums text-purple-200 mt-1">
              {formatPrice(erl.price)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{erl.source}</p>
          </div>
        )}
      </div>

      {/* Alignment badge */}
      <div className={`p-3 rounded-lg border ${alignment.color}`}>
        <p className="text-xs font-bold">
          {alignment.emoji} {alignment.label}
        </p>
        <p className="text-xs opacity-90 mt-1">{alignment.description}</p>
      </div>

      {/* Position meaning */}
      {positionInfo && (
        <p className="text-xs text-gray-500">
          {positionInfo.meaning}
        </p>
      )}
    </div>
  );
}