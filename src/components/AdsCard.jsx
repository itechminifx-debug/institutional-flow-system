"use client";

import { formatPrice } from "@/lib/formatNumbers";

// ============================================================
// Sub-components
// ============================================================

function PhasePanel({ title, emoji, phase, accent = "amber", children }) {
  const accentMap = {
    amber:   "border-amber-800/60 bg-amber-950/20",
    orange:  "border-orange-800/60 bg-orange-950/20",
    emerald: "border-emerald-800/60 bg-emerald-950/20",
    blue:    "border-blue-800/60 bg-blue-950/20",
    purple:  "border-purple-800/60 bg-purple-950/20",
  };
  const cls = accentMap[accent] || accentMap.amber;

  return (
    <div className={`ml-8 p-3 rounded-lg border space-y-2 ${cls}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-gray-200">{emoji} {title}</p>
        {typeof phase?.score === "number" && (
          <span className={`text-[10px] font-bold ${phase.ready ? "text-green-300" : "text-yellow-300"}`}>
            {phase.ready ? "READY" : "WAIT"} · {phase.score}%
          </span>
        )}
      </div>
      <div className="space-y-1">
        {phase?.gates?.map((g, i) => (
          <div
            key={g.key || i}
            className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs ${
              g.pass
                ? g.bonus
                  ? "bg-gray-900/40 border border-gray-700"
                  : g.warning
                  ? "bg-yellow-950/30 border border-yellow-800"
                  : "bg-green-950/20 border border-green-800"
                : g.bonus
                ? "bg-gray-900/40 border border-gray-700"
                : "bg-red-950/20 border border-red-800"
            }`}
          >
            <span className="text-sm leading-none mt-0.5">
              {g.pass ? (g.bonus ? "🌟" : g.warning ? "⚠️" : "✅") : g.bonus ? "⚪" : "❌"}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold ${
                g.pass
                  ? g.bonus ? "text-amber-200" : g.warning ? "text-yellow-200" : "text-green-200"
                  : g.bonus ? "text-gray-300" : "text-red-200"
              }`}>{g.label}</p>
              <p className={`mt-0.5 ${
                g.pass
                  ? g.bonus ? "text-amber-300/90" : g.warning ? "text-yellow-300/90" : "text-green-300/90"
                  : g.bonus ? "text-gray-400" : "text-red-300/90"
              }`}>{g.detail}</p>
            </div>
          </div>
        ))}
        {children}
      </div>
    </div>
  );
}

// ============================================================
// The Three-Tier Map — shows D1 → M30 → M1 visually
// ============================================================
function ThreeTierMap({
  d1Bias,
  d1RangeHigh,
  d1RangeLow,
  currentPrice,
  dolLevel,
  m30SweepLevel,
  m30FvgHigh,
  m30FvgLow,
  m1EntryPrice,
  stopLoss,
  tp1Price,
  tp2Price,
}) {
  const rHigh = parseFloat(d1RangeHigh);
  const rLow = parseFloat(d1RangeLow);
  const cur = parseFloat(currentPrice);
  const dol = parseFloat(dolLevel);
  const sweep = parseFloat(m30SweepLevel);
  const fvgH = parseFloat(m30FvgHigh);
  const fvgL = parseFloat(m30FvgLow);
  const entry = parseFloat(m1EntryPrice);
  const sl = parseFloat(stopLoss);
  const tp1 = parseFloat(tp1Price);
  const tp2 = parseFloat(tp2Price);

  // Need range to draw
  if (isNaN(rHigh) || isNaN(rLow) || rHigh <= rLow) {
    return (
      <div className="p-3 rounded-lg bg-black/40 border border-gray-800 text-center">
        <p className="text-xs text-gray-500">Enter D1 range to see the map.</p>
      </div>
    );
  }

  // Chart layout
  const priceRange = rHigh - rLow;
  const padding = priceRange * 0.2;
  const topPrice = rHigh + padding;
  const bottomPrice = rLow - padding;
  const totalRange = topPrice - bottomPrice;
  const height = 320;
  const chartTop = 20;
  const chartBottom = height - 20;

  const priceToY = (p) => {
    if (isNaN(p)) return null;
    const ratio = (p - bottomPrice) / totalRange;
    return chartTop + (chartBottom - chartTop) * (1 - ratio);
  };

  const rHighY = priceToY(rHigh);
  const rLowY = priceToY(rLow);
  const curY = !isNaN(cur) ? priceToY(cur) : null;
  const dolY = !isNaN(dol) ? priceToY(dol) : null;
  const sweepY = !isNaN(sweep) ? priceToY(sweep) : null;
  const fvgHY = !isNaN(fvgH) ? priceToY(fvgH) : null;
  const fvgLY = !isNaN(fvgL) ? priceToY(fvgL) : null;
  const entryY = !isNaN(entry) ? priceToY(entry) : null;
  const slY = !isNaN(sl) ? priceToY(sl) : null;
  const tp1Y = !isNaN(tp1) ? priceToY(tp1) : null;
  const tp2Y = !isNaN(tp2) ? priceToY(tp2) : null;

  const isShort = d1Bias === "bearish";

  return (
    <div className="p-3 rounded-lg bg-black/60 border border-amber-800/60 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-amber-300">👑 Three-Tier Map</p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
          isShort
            ? "bg-red-900/40 border border-red-700 text-red-200"
            : "bg-green-900/40 border border-green-700 text-green-200"
        }`}>
          {isShort ? "SHORT" : "LONG"}
        </span>
      </div>

      <div className="relative" style={{ height: `${height}px` }}>
        {/* Background */}
        <div className="absolute inset-0 bg-black/30 rounded border border-gray-800" />

        {/* D1 Range — top line */}
        <div className="absolute left-0 right-0 flex items-center" style={{ top: `${rHighY}px` }}>
          <div className="flex-1 border-t border-gray-600" />
          <span className="text-[9px] text-gray-400 font-mono px-1 bg-black/80 rounded">
            D1 HIGH {formatPrice(rHigh)}
          </span>
          <div className="flex-1 border-t border-gray-600" />
        </div>

        {/* D1 CE line (midpoint) */}
        <div className="absolute left-0 right-0 flex items-center" style={{ top: `${(rHighY + rLowY) / 2}px` }}>
          <div className="flex-1 border-t border-dashed border-gray-700" />
          <span className="text-[9px] text-gray-500 font-mono px-1 bg-black/80 rounded">
            CE {formatPrice((rHigh + rLow) / 2)}
          </span>
          <div className="flex-1 border-t border-dashed border-gray-700" />
        </div>

        {/* D1 Range — bottom line */}
        <div className="absolute left-0 right-0 flex items-center" style={{ top: `${rLowY}px` }}>
          <div className="flex-1 border-t border-gray-600" />
          <span className="text-[9px] text-gray-400 font-mono px-1 bg-black/80 rounded">
            D1 LOW {formatPrice(rLow)}
          </span>
          <div className="flex-1 border-t border-gray-600" />
        </div>

        {/* DOL target — gold dashed */}
        {dolY !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${dolY}px` }}>
            <div className="flex-1 border-t-2 border-dashed border-amber-400" />
            <span className="text-[10px] text-amber-200 font-bold px-1 bg-amber-900/80 rounded">
              🎯 DOL {formatPrice(dol)}
            </span>
            <div className="flex-1 border-t-2 border-dashed border-amber-400" />
          </div>
        )}

        {/* M30 Sweep — orange */}
        {sweepY !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${sweepY}px` }}>
            <div className="flex-1 border-t border-orange-500" />
            <span className="text-[9px] text-orange-200 font-bold px-1 bg-orange-900/80 rounded">
              SWEEP {formatPrice(sweep)}
            </span>
            <div className="flex-1 border-t border-orange-500" />
          </div>
        )}

        {/* M30 FVG — purple band */}
        {fvgHY !== null && fvgLY !== null && (
          <div
            className="absolute left-[15%] right-[15%] bg-purple-500/20 border-l border-r border-purple-500"
            style={{
              top: `${fvgHY}px`,
              height: `${Math.max(fvgLY - fvgHY, 4)}px`,
            }}
          >
            <span className="absolute top-0 left-1 text-[9px] text-purple-200 font-bold">
              M30 FVG
            </span>
          </div>
        )}

        {/* Current price — cyan */}
        {curY !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${curY}px` }}>
            <div className="flex-1 border-t border-cyan-400" />
            <span className="text-[9px] text-cyan-200 font-bold px-1 bg-cyan-900/80 rounded">
              PRICE {formatPrice(cur)}
            </span>
            <div className="flex-1 border-t border-cyan-400" />
          </div>
        )}

        {/* M1 Entry — yellow */}
        {entryY !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${entryY}px` }}>
            <div className="flex-1 border-t border-yellow-400" />
            <span className="text-[9px] text-yellow-200 font-bold px-1 bg-yellow-900/80 rounded">
              ENTRY {formatPrice(entry)}
            </span>
            <div className="flex-1 border-t border-yellow-400" />
          </div>
        )}

        {/* SL — red */}
        {slY !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${slY}px` }}>
            <div className="flex-1 border-t border-red-500" />
            <span className="text-[9px] text-red-200 font-bold px-1 bg-red-900/80 rounded">
              SL {formatPrice(sl)}
            </span>
            <div className="flex-1 border-t border-red-500" />
          </div>
        )}

        {/* TP1 — green dashed */}
        {tp1Y !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${tp1Y}px` }}>
            <div className="flex-1 border-t border-dashed border-green-400" />
            <span className="text-[9px] text-green-200 font-bold px-1 bg-green-900/80 rounded">
              TP1 {formatPrice(tp1)}
            </span>
            <div className="flex-1 border-t border-dashed border-green-400" />
          </div>
        )}

        {/* TP2 — bright green */}
        {tp2Y !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${tp2Y}px` }}>
            <div className="flex-1 border-t-2 border-green-500" />
            <span className="text-[10px] text-green-200 font-bold px-1 bg-green-900/80 rounded">
              TP2 {formatPrice(tp2)}
            </span>
            <div className="flex-1 border-t-2 border-green-500" />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-400">
        <p>D1 Zone: <span className={`font-bold ${d1Bias === "bearish" ? "text-red-300" : "text-green-300"}`}>{d1Bias?.toUpperCase() || "—"}</span></p>
        <p>Range: <span className="text-white font-mono">{formatPrice(rLow)} – {formatPrice(rHigh)}</span></p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN CARD
// ============================================================
export default function AdsCard({ data }) {
  if (!data) return null;

  const { d1, m30, m1, trade, preEntryReady, reasons, isAplus, poiZoneWarning, emaConflict, d1Zone, m30PoiZone } = data;

  const verdict = preEntryReady && trade ? trade.direction : "WAIT";
  const verdictColor =
    verdict === "BUY" ? "bg-green-900/40 border-green-600 text-green-200"
    : verdict === "SELL" ? "bg-red-900/40 border-red-600 text-red-200"
    : "bg-yellow-950/40 border-yellow-700 text-yellow-200";
  const verdictEmoji = verdict === "BUY" ? "🟢" : verdict === "SELL" ? "🔴" : "⏳";

  return (
    <div className="p-4 rounded-lg bg-gray-900 border-2 border-amber-800 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-amber-300">👑 Apex Deep Search</h2>
          <p className="text-xs text-gray-500 mt-0.5">D1 Narrative → M30 Trap → M1 Trigger</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {isAplus && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border-2 border-amber-500 bg-amber-900/60 text-amber-100 font-bold">
              🌟 A+
            </span>
          )}
          {emaConflict && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold bg-red-900/40 border-red-700 text-red-200">
              📉 EMA ✗
            </span>
          )}
          <span className={`text-xs px-3 py-1 rounded-full border-2 font-bold ${verdictColor}`}>
            {verdictEmoji} {verdict}
          </span>
        </div>
      </div>

      {/* Warnings */}
      {poiZoneWarning && (
        <div className="p-3 rounded-lg bg-yellow-950/40 border-2 border-yellow-700 space-y-1">
          <p className="text-xs font-bold text-yellow-200">⚠️ M30 FVG in wrong zone</p>
          <p className="text-[11px] text-yellow-100/90">
            The M30 FVG is in the {m30PoiZone?.toUpperCase()} zone — wrong side for your bias.
            Proceed with extreme caution or abort (Red Flag #4).
          </p>
        </div>
      )}

      {/* Three-Tier Map */}
      <ThreeTierMap
        d1Bias={data.d1Bias}
        d1RangeHigh={data.d1RangeHigh}
        d1RangeLow={data.d1RangeLow}
        currentPrice={data.currentPrice}
        dolLevel={data.dolLevel}
        m30SweepLevel={data.m30SweepLevel}
        m30FvgHigh={data.m30FvgHigh}
        m30FvgLow={data.m30FvgLow}
        m1EntryPrice={data.m1EntryPrice}
        stopLoss={data.stopLoss}
        tp1Price={data.tp1Price}
        tp2Price={data.tp2Price}
      />

      {/* Phase Panels */}
      <PhasePanel title="Phase 1 — D1 Narrative (WHERE)" emoji="🌍" phase={d1} accent="blue" />
      <PhasePanel title="Phase 2 — M30 Trap (WHEN)" emoji="🪤" phase={m30} accent="orange" />
      <PhasePanel title="Phase 3 — M1 Trigger (HOW)" emoji="🎯" phase={m1} accent="emerald" />

      {/* Trade Card */}
      {trade && preEntryReady && !trade.invalid && (
        <div className="p-4 rounded-lg bg-amber-950/30 border-2 border-amber-700 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-bold text-amber-200">💰 Trade Setup</p>
            <span className={`text-xs px-2 py-1 rounded-full font-bold ${
              trade.direction === "BUY" ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
            }`}>
              {trade.direction}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Entry</p>
              <p className="font-bold tabular-nums text-yellow-400">{formatPrice(trade.entry)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Stop Loss (razor)</p>
              <p className="font-bold tabular-nums text-red-400">{formatPrice(trade.sl)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">TP2 (Final DOL)</p>
              <p className="font-bold tabular-nums text-green-400">{formatPrice(trade.tp2)}</p>
            </div>
            {trade.tp1 !== null && (
              <div>
                <p className="text-xs text-gray-500">TP1 (Partial)</p>
                <p className="font-bold tabular-nums text-green-300">{formatPrice(trade.tp1)}</p>
              </div>
            )}
            {trade.rr1 !== null && (
              <div>
                <p className="text-xs text-gray-500">RR @ TP1</p>
                <p className={`font-bold tabular-nums ${trade.rr1 >= 2 ? "text-green-300" : "text-yellow-300"}`}>
                  1:{trade.rr1.toFixed(2)}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">RR @ TP2</p>
              <p className={`font-bold tabular-nums ${trade.rr2 >= 3 ? "text-green-300" : "text-yellow-300"}`}>
                1:{trade.rr2.toFixed(2)}
              </p>
            </div>
            {trade.riskAmount !== undefined && (
              <div>
                <p className="text-xs text-gray-500">Risk</p>
                <p className="font-bold tabular-nums text-white">${trade.riskAmount}</p>
              </div>
            )}
          </div>

          {trade.tp1 !== null && (
            <div className="pt-2 border-t border-amber-800/60 text-[11px] text-amber-200/90 space-y-0.5">
              <p>• At TP1: take 50% off, move SL to break-even</p>
              <p>• Run remainder to TP2 (the D1 DOL)</p>
            </div>
          )}
        </div>
      )}

      {/* Invalid */}
      {trade?.invalid && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-700 text-red-200 text-xs">
          <strong>Invalid Trade:</strong> {trade.invalidReason}
        </div>
      )}

      {/* Reasons */}
      {!preEntryReady && reasons && reasons.length > 0 && (
        <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-800 space-y-2">
          <p className="text-xs font-bold text-yellow-200">⏳ Golden Rule Incomplete</p>
          <p className="text-[10px] text-yellow-300/80 italic">D1 tells WHERE · M30 tells WHEN · M1 tells HOW</p>
          <ul className="text-xs text-yellow-200 space-y-1 ml-4 list-disc">
            {reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}