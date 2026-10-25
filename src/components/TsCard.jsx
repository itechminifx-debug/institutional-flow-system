"use client";

import { formatPrice } from "@/lib/formatNumbers";

// ============================================================
// Sub-components
// ============================================================

function PhasePanel({ title, emoji, phase, accent = "violet", children }) {
  const accentMap = {
    violet:  "border-violet-800/60 bg-violet-950/20",
    orange:  "border-orange-800/60 bg-orange-950/20",
    purple:  "border-purple-800/60 bg-purple-950/20",
    emerald: "border-emerald-800/60 bg-emerald-950/20",
  };
  const cls = accentMap[accent] || accentMap.violet;

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
              g.pass ? "bg-green-950/20 border border-green-800" : "bg-red-950/20 border border-red-800"
            }`}
          >
            <span className="text-sm leading-none mt-0.5">{g.pass ? "✅" : "❌"}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold ${g.pass ? "text-green-200" : "text-red-200"}`}>{g.label}</p>
              <p className={`mt-0.5 ${g.pass ? "text-green-300/90" : "text-red-300/90"}`}>{g.detail}</p>
            </div>
          </div>
        ))}
        {children}
      </div>
    </div>
  );
}

// ============================================================
// 1H Container Visual
// ============================================================
function ContainerVisual({
  d1Bias,
  h1High,
  h1Low,
  h1Ce,
  currentPrice,
  sweepDirection,
  sweepLevel,
  fvgHigh,
  fvgLow,
  entryPrice,
  stopLoss,
  tp1Price,
  tp2Price,
}) {
  const h = parseFloat(h1High);
  const l = parseFloat(h1Low);
  const ce = parseFloat(h1Ce);
  const cur = parseFloat(currentPrice);
  const sweep = parseFloat(sweepLevel);
  const fH = parseFloat(fvgHigh);
  const fL = parseFloat(fvgLow);
  const entry = parseFloat(entryPrice);
  const sl = parseFloat(stopLoss);
  const tp1 = parseFloat(tp1Price);
  const tp2 = parseFloat(tp2Price);

  if (isNaN(h) || isNaN(l) || h <= l) {
    return (
      <div className="p-3 rounded-lg bg-black/40 border border-gray-800 text-center">
        <p className="text-xs text-gray-500">Enter 1H High and Low to see the container.</p>
      </div>
    );
  }

  const isShort = d1Bias === "bearish";

  // Chart layout
  const priceRange = h - l;
  const padding = priceRange * 0.25; // extra room for sweep + TP2
  const topPrice = h + padding;
  const bottomPrice = l - padding;
  const totalRange = topPrice - bottomPrice;
  const height = 340;
  const chartTop = 20;
  const chartBottom = height - 20;

  const priceToY = (p) => {
    if (isNaN(p)) return null;
    const ratio = (p - bottomPrice) / totalRange;
    return chartTop + (chartBottom - chartTop) * (1 - ratio);
  };

  const hY = priceToY(h);
  const lY = priceToY(l);
  const ceY = priceToY(ce);
  const curY = !isNaN(cur) ? priceToY(cur) : null;
  const sweepY = !isNaN(sweep) ? priceToY(sweep) : null;
  const fvgHY = !isNaN(fH) ? priceToY(fH) : null;
  const fvgLY = !isNaN(fL) ? priceToY(fL) : null;
  const entryY = !isNaN(entry) ? priceToY(entry) : null;
  const slY = !isNaN(sl) ? priceToY(sl) : null;
  const tp1Y = !isNaN(tp1) ? priceToY(tp1) : null;
  const tp2Y = !isNaN(tp2) ? priceToY(tp2) : null;

  return (
    <div className="p-3 rounded-lg bg-black/60 border border-violet-800/60 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-violet-300">⏱️ 1H Container</p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
          isShort
            ? "bg-red-900/40 border border-red-700 text-red-200"
            : "bg-green-900/40 border border-green-700 text-green-200"
        }`}>
          {isShort ? "SHORT" : "LONG"} · {isShort ? "targeting 1H LOW" : "targeting 1H HIGH"}
        </span>
      </div>

      <div className="relative" style={{ height: `${height}px` }}>
        {/* Background */}
        <div className="absolute inset-0 bg-black/30 rounded border border-gray-800" />

        {/* 1H Candle body (the container) */}
        <div
          className="absolute left-[40%] right-[40%] bg-violet-500/20 border-l-2 border-r-2 border-violet-500"
          style={{
            top: `${hY}px`,
            height: `${Math.max(lY - hY, 4)}px`,
          }}
        >
          <span className="absolute top-0 left-1 text-[9px] text-violet-300 font-bold">1H Candle</span>
        </div>

        {/* 1H High line */}
        <div className="absolute left-0 right-0 flex items-center" style={{ top: `${hY}px` }}>
          <div className="flex-1 border-t border-violet-500" />
          <span className="text-[9px] text-violet-200 font-bold px-1 bg-violet-900/80 rounded">
            1H HIGH {formatPrice(h)}
          </span>
          <div className="flex-1 border-t border-violet-500" />
        </div>

        {/* 1H CE (50%) — dashed gold */}
        {ceY !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${ceY}px` }}>
            <div className="flex-1 border-t border-dashed border-amber-400" />
            <span className="text-[10px] text-amber-200 font-bold px-1 bg-amber-900/80 rounded">
              CE (50%) {formatPrice(ce)}
            </span>
            <div className="flex-1 border-t border-dashed border-amber-400" />
          </div>
        )}

        {/* 1H Low line */}
        <div className="absolute left-0 right-0 flex items-center" style={{ top: `${lY}px` }}>
          <div className="flex-1 border-t border-violet-500" />
          <span className="text-[9px] text-violet-200 font-bold px-1 bg-violet-900/80 rounded">
            1H LOW {formatPrice(l)}
          </span>
          <div className="flex-1 border-t border-violet-500" />
        </div>

        {/* FVG zone */}
        {fvgHY !== null && fvgLY !== null && (
          <div
            className="absolute left-[20%] right-[20%] bg-orange-500/20 border-l border-r border-orange-500"
            style={{
              top: `${Math.min(fvgHY, fvgLY)}px`,
              height: `${Math.max(Math.abs(fvgLY - fvgHY), 4)}px`,
            }}
          >
            <span className="absolute top-0 left-1 text-[9px] text-orange-300 font-bold">
              FVG (POI)
            </span>
          </div>
        )}

        {/* Sweep marker — beyond the 1H edge */}
        {sweepY !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${sweepY}px` }}>
            <div className="flex-1 border-t-2 border-red-500" />
            <span className="text-[10px] text-red-200 font-bold px-1 bg-red-900/80 rounded">
              🩸 SWEEP {formatPrice(sweep)}
            </span>
            <div className="flex-1 border-t-2 border-red-500" />
          </div>
        )}

        {/* SL */}
        {slY !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${slY}px` }}>
            <div className="flex-1 border-t border-dashed border-red-400" />
            <span className="text-[9px] text-red-300 font-bold px-1 bg-red-900/60 rounded">
              SL {formatPrice(sl)}
            </span>
            <div className="flex-1 border-t border-dashed border-red-400" />
          </div>
        )}

        {/* Current price */}
        {curY !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${curY}px` }}>
            <div className="flex-1 border-t border-cyan-400" />
            <span className="text-[9px] text-cyan-200 font-bold px-1 bg-cyan-900/80 rounded">
              PRICE {formatPrice(cur)}
            </span>
            <div className="flex-1 border-t border-cyan-400" />
          </div>
        )}

        {/* Entry */}
        {entryY !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${entryY}px` }}>
            <div className="flex-1 border-t border-yellow-400" />
            <span className="text-[9px] text-yellow-200 font-bold px-1 bg-yellow-900/80 rounded">
              ENTRY {formatPrice(entry)}
            </span>
            <div className="flex-1 border-t border-yellow-400" />
          </div>
        )}

        {/* TP1 (CE partial) */}
        {tp1Y !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${tp1Y}px` }}>
            <div className="flex-1 border-t border-dashed border-green-400" />
            <span className="text-[9px] text-green-200 font-bold px-1 bg-green-900/80 rounded">
              TP1 (50%) {formatPrice(tp1)}
            </span>
            <div className="flex-1 border-t border-dashed border-green-400" />
          </div>
        )}

        {/* TP2 (opposite edge) */}
        {tp2Y !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${tp2Y}px` }}>
            <div className="flex-1 border-t-2 border-green-500" />
            <span className="text-[10px] text-green-200 font-bold px-1 bg-green-900/80 rounded">
              🎯 TP2 (DOL) {formatPrice(tp2)}
            </span>
            <div className="flex-1 border-t-2 border-green-500" />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-400">
        <p>Container H: <span className="text-violet-200 font-mono">{formatPrice(h)}</span></p>
        <p>Container L: <span className="text-violet-200 font-mono">{formatPrice(l)}</span></p>
        <p>CE: <span className="text-amber-200 font-mono">{formatPrice(ce)}</span></p>
        <p>Bias: <span className={isShort ? "text-red-300" : "text-green-300"}>{d1Bias?.toUpperCase() || "—"}</span></p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN CARD
// ============================================================
export default function TsCard({ data }) {
  if (!data) return null;

  const { container, trap, zone, trigger, trade, preEntryReady, reasons } = data;

  const verdict = preEntryReady && trade ? trade.direction : "WAIT";
  const verdictColor =
    verdict === "BUY" ? "bg-green-900/40 border-green-600 text-green-200"
    : verdict === "SELL" ? "bg-red-900/40 border-red-600 text-red-200"
    : "bg-yellow-950/40 border-yellow-700 text-yellow-200";
  const verdictEmoji = verdict === "BUY" ? "🟢" : verdict === "SELL" ? "🔴" : "⏳";

  // Check if TP1 is over 1R and TP2 is over 2R (common thresholds)
  const tp1Good = trade?.rr1 !== undefined && trade.rr1 >= 1;
  const tp2Good = trade?.rr2 !== undefined && trade.rr2 >= 2;

  return (
    <div className="p-4 rounded-lg bg-gray-900 border-2 border-violet-800 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-violet-300">⏱️ Time-Slice Setup</h2>
          <p className="text-xs text-gray-500 mt-0.5">1H Container → 15M Trap → 5M Zone → 1M Trigger</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full border-2 font-bold ${verdictColor}`}>
          {verdictEmoji} {verdict}
        </span>
      </div>

      {/* Container Visual */}
      <ContainerVisual
        d1Bias={data.d1Bias}
        h1High={data.h1High}
        h1Low={data.h1Low}
        h1Ce={data.ce}
        currentPrice={data.currentPrice}
        sweepDirection={data.sweepDirection}
        sweepLevel={data.sweepLevel}
        fvgHigh={data.fvgHigh}
        fvgLow={data.fvgLow}
        entryPrice={data.entryPrice}
        stopLoss={trade?.sl}
        tp1Price={trade?.tp1}
        tp2Price={trade?.tp2}
      />

      {/* Phase Panels */}
      <PhasePanel title="Phase 1 — Container (1H)" emoji="📦" phase={container} accent="violet" />
      <PhasePanel title="Phase 2 — Trap (15M)" emoji="🪤" phase={trap} accent="orange" />
      <PhasePanel title="Phase 3 — Zone (5M)" emoji="🎯" phase={zone} accent="purple" />
      <PhasePanel title="Phase 4 — Trigger (1M)" emoji="⚡" phase={trigger} accent="emerald" />

      {/* Trade Card */}
      {trade && preEntryReady && !trade.invalid && (
        <div className="p-4 rounded-lg bg-violet-950/30 border-2 border-violet-700 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-bold text-violet-200">💰 Execution Plan</p>
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
              <p className="text-xs text-gray-500">Stop Loss</p>
              <p className="font-bold tabular-nums text-red-400">{formatPrice(trade.sl)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">TP1 (50% off)</p>
              <p className={`font-bold tabular-nums ${tp1Good ? "text-green-300" : "text-yellow-300"}`}>
                {formatPrice(trade.tp1)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">TP2 (DOL)</p>
              <p className={`font-bold tabular-nums ${tp2Good ? "text-green-300" : "text-yellow-300"}`}>
                {formatPrice(trade.tp2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">RR @ TP1</p>
              <p className={`font-bold tabular-nums ${tp1Good ? "text-green-300" : "text-yellow-300"}`}>
                1:{trade.rr1?.toFixed(2) ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">RR @ TP2</p>
              <p className={`font-bold tabular-nums ${tp2Good ? "text-green-300" : "text-yellow-300"}`}>
                1:{trade.rr2?.toFixed(2) ?? "—"}
              </p>
            </div>
            {trade.riskAmount !== undefined && (
              <div>
                <p className="text-xs text-gray-500">Risk</p>
                <p className="font-bold tabular-nums text-white">${trade.riskAmount}</p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-violet-800/60 text-[11px] text-violet-200/90 space-y-0.5">
            <p>• At TP1 (CE): Take 50% off, move SL to break-even</p>
            <p>• Let the remainder run to TP2 (the opposite edge of the 1H candle)</p>
          </div>
        </div>
      )}

      {/* Invalid Trade */}
      {trade?.invalid && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-700 text-red-200 text-xs">
          <strong>Invalid Trade:</strong> {trade.invalidReason}
        </div>
      )}

      {/* Reasons */}
      {!preEntryReady && reasons && reasons.length > 0 && (
        <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-800 space-y-2">
          <p className="text-xs font-bold text-yellow-200">⏳ Sequence Incomplete</p>
          <p className="text-[10px] text-yellow-300/80 italic">"The 1H gives boundaries. The 15M gives the trap. The 5M gives the POI. The 1M gives the trigger."</p>
          <ul className="text-xs text-yellow-200 space-y-1 ml-4 list-disc">
            {reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}