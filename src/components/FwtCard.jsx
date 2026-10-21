"use client";

import { formatPrice } from "@/lib/formatNumbers";
import { WICK_DIRECTIONS, LIQUIDITY_SWEPT_TYPES } from "@/lib/fwtEngine";

// ============================================================
// Sub-components
// ============================================================

function StagePanel({ title, emoji, stage, accent = "teal", children }) {
  const accentMap = {
    teal:    "border-teal-800/60 bg-teal-950/20",
    blue:    "border-blue-800/60 bg-blue-950/20",
    purple:  "border-purple-800/60 bg-purple-950/20",
    emerald: "border-emerald-800/60 bg-emerald-950/20",
    orange:  "border-orange-800/60 bg-orange-950/20",
    red:     "border-red-800/60 bg-red-950/20",
  };
  const cls = accentMap[accent] || accentMap.teal;

  return (
    <div className={`ml-8 p-3 rounded-lg border space-y-2 ${cls}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-gray-200">{emoji} {title}</p>
        {typeof stage?.score === "number" && (
          <span className={`text-[10px] font-bold ${stage.ready ? "text-green-300" : "text-yellow-300"}`}>
            {stage.ready ? "READY" : "WAIT"} · {stage.score}%
          </span>
        )}
      </div>
      <div className="space-y-1">
        {stage?.gates?.map((g, i) => (
          <div
            key={g.key || i}
            className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs ${
              g.pass
                ? g.warning
                  ? "bg-yellow-950/30 border border-yellow-800"
                  : "bg-green-950/20 border border-green-800"
                : g.bonus
                ? "bg-gray-900/40 border border-gray-700"
                : "bg-red-950/20 border border-red-800"
            }`}
          >
            <span className="text-sm leading-none mt-0.5">
              {g.pass ? (g.warning ? "⚠️" : "✅") : g.bonus ? "⚪" : "❌"}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold ${
                g.pass
                  ? g.warning ? "text-yellow-200" : "text-green-200"
                  : g.bonus ? "text-gray-300" : "text-red-200"
              }`}>{g.label}</p>
              <p className={`mt-0.5 ${
                g.pass
                  ? g.warning ? "text-yellow-300/90" : "text-green-300/90"
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
// The 4H Candle Visual — shows the trap setup visually
// ============================================================
function CandleVisual({
  mode,
  candleOpen,
  candleHigh,
  candleLow,
  candleClose,
  currentPrice,
  wickDirection,
  wickExtreme,
  entryPrice,
  stopLoss,
  targetPrice,
  dailyBias,
}) {
  const o = parseFloat(candleOpen);
  const h = parseFloat(candleHigh);
  const l = parseFloat(candleLow);
  const c = parseFloat(candleClose);
  const cur = parseFloat(currentPrice);
  const wExt = parseFloat(wickExtreme);
  const entry = parseFloat(entryPrice);
  const sl = parseFloat(stopLoss);
  const tp = parseFloat(targetPrice);

  // Need at least high/low to draw
  if (isNaN(h) || isNaN(l) || h <= l) {
    return (
      <div className="p-3 rounded-lg bg-black/40 border border-gray-800 text-center">
        <p className="text-xs text-gray-500">Enter candle bounds to see the visual.</p>
      </div>
    );
  }

  // Chart layout — vertical price axis (high at top, low at bottom)
  const priceRange = h - l;
  const padding = priceRange * 0.15;
  const topPrice = h + padding;
  const bottomPrice = l - padding;
  const totalRange = topPrice - bottomPrice;
  const height = 260;
  const chartTop = 20;
  const chartBottom = height - 20;

  // Convert price → pixel Y (inverted: high price = low Y)
  const priceToY = (p) => {
    if (isNaN(p)) return null;
    const ratio = (p - bottomPrice) / totalRange;
    return chartTop + (chartBottom - chartTop) * (1 - ratio);
  };

  const oY = !isNaN(o) ? priceToY(o) : null;
  const cY = !isNaN(c) ? priceToY(c) : null;
  const hY = priceToY(h);
  const lY = priceToY(l);
  const curY = !isNaN(cur) ? priceToY(cur) : null;
  const wExtY = !isNaN(wExt) ? priceToY(wExt) : null;
  const entryY = !isNaN(entry) ? priceToY(entry) : null;
  const slY = !isNaN(sl) ? priceToY(sl) : null;
  const tpY = !isNaN(tp) ? priceToY(tp) : null;

  // Body
  const bodyTop = oY !== null && cY !== null ? Math.min(oY, cY) : Math.min(hY, lY);
  const bodyHeight = oY !== null && cY !== null ? Math.max(Math.abs(cY - oY), 2) : 4;
  const bodyColor = cY !== null && oY !== null
    ? (c < o ? "bg-red-600" : "bg-green-600")
    : "bg-gray-600";

  const isUpperWick = wickDirection === "upper";
  const isShort = dailyBias === "bearish";

  return (
    <div className="p-3 rounded-lg bg-black/60 border border-teal-800/60 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-teal-300">
          🕯️ 4H Candle {mode === "live" ? "(Live)" : "(Closed)"}
        </p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
          isShort
            ? "bg-red-900/40 border border-red-700 text-red-200"
            : "bg-green-900/40 border border-green-700 text-green-200"
        }`}>
          {isShort ? "SHORT BIAS" : "LONG BIAS"}
        </span>
      </div>

      <div className="relative" style={{ height: `${height}px` }}>
        {/* Chart background */}
        <div className="absolute inset-0 bg-black/30 rounded border border-gray-800" />

        {/* Candle wicks (lines) */}
        <div
          className="absolute left-1/2 w-px bg-white/40"
          style={{
            top: `${hY}px`,
            height: `${lY - hY}px`,
            transform: "translateX(-50%)",
          }}
        />

        {/* Body */}
        <div
          className={`absolute left-1/2 w-8 rounded-sm ${bodyColor}`}
          style={{
            top: `${bodyTop}px`,
            height: `${bodyHeight}px`,
            transform: "translateX(-50%)",
          }}
        />

        {/* Wick extreme marker (the trap) */}
        {wExtY !== null && (
          <div
            className="absolute left-0 right-0 flex items-center"
            style={{ top: `${wExtY}px` }}
          >
            <div className="flex-1 border-t border-dashed border-orange-500" />
            <span className="text-[10px] text-orange-300 font-bold px-1 bg-black/80 rounded">
              WICK {isUpperWick ? "HIGH" : "LOW"} {formatPrice(wExt)}
            </span>
            <div className="flex-1 border-t border-dashed border-orange-500" />
          </div>
        )}

        {/* Current price marker */}
        {curY !== null && (
          <div
            className="absolute left-0 right-0 flex items-center"
            style={{ top: `${curY}px` }}
          >
            <div className="flex-1 border-t border-cyan-400" />
            <span className="text-[10px] text-cyan-200 font-bold px-1 bg-cyan-900/80 rounded">
              PRICE {formatPrice(cur)}
            </span>
            <div className="flex-1 border-t border-cyan-400" />
          </div>
        )}

        {/* Entry marker */}
        {entryY !== null && (
          <div
            className="absolute left-0 right-0 flex items-center"
            style={{ top: `${entryY}px` }}
          >
            <div className="flex-1 border-t border-yellow-400" />
            <span className="text-[10px] text-yellow-200 font-bold px-1 bg-yellow-900/80 rounded">
              ENTRY {formatPrice(entry)}
            </span>
            <div className="flex-1 border-t border-yellow-400" />
          </div>
        )}

        {/* SL marker */}
        {slY !== null && (
          <div
            className="absolute left-0 right-0 flex items-center"
            style={{ top: `${slY}px` }}
          >
            <div className="flex-1 border-t border-red-500" />
            <span className="text-[10px] text-red-200 font-bold px-1 bg-red-900/80 rounded">
              SL {formatPrice(sl)}
            </span>
            <div className="flex-1 border-t border-red-500" />
          </div>
        )}

        {/* TP marker */}
        {tpY !== null && (
          <div
            className="absolute left-0 right-0 flex items-center"
            style={{ top: `${tpY}px` }}
          >
            <div className="flex-1 border-t border-green-500" />
            <span className="text-[10px] text-green-200 font-bold px-1 bg-green-900/80 rounded">
              TP {formatPrice(tp)}
            </span>
            <div className="flex-1 border-t border-green-500" />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-400">
        <p>Open: <span className="text-white font-mono">{isNaN(o) ? "—" : formatPrice(o)}</span></p>
        <p>High: <span className="text-white font-mono">{formatPrice(h)}</span></p>
        <p>Low: <span className="text-white font-mono">{formatPrice(l)}</span></p>
        <p>Close: <span className="text-white font-mono">{isNaN(c) ? "—" : formatPrice(c)}</span></p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN CARD
// ============================================================
export default function FwtCard({ data }) {
  if (!data) return null;

  const { mode, context, wick, structure, entry, trade, preEntryReady, reasons } = data;

  const verdict = preEntryReady && trade ? trade.direction : "WAIT";
  const verdictColor =
    verdict === "BUY" ? "bg-green-900/40 border-green-600 text-green-200"
    : verdict === "SELL" ? "bg-red-900/40 border-red-600 text-red-200"
    : "bg-yellow-950/40 border-yellow-700 text-yellow-200";
  const verdictEmoji = verdict === "BUY" ? "🟢" : verdict === "SELL" ? "🔴" : "⏳";

  // Extract candle info from context gates for the visual
  const candle = data.candle || {};

  return (
    <div className="p-4 rounded-lg bg-gray-900 border-2 border-teal-800 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-teal-300">🕯️ FWT — 4-Hour Wick Trap</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Sequence: Bias → Wick → 15M Shift → 1M Entry
            {mode === "live" && <span className="ml-1 text-cyan-400">· LIVE</span>}
            {mode === "closed" && <span className="ml-1 text-purple-400">· CLOSED</span>}
          </p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full border-2 font-bold ${verdictColor}`}>
          {verdictEmoji} {verdict}
        </span>
      </div>

      {/* Candle visual */}
      <CandleVisual
        mode={mode}
        candleOpen={candle.open}
        candleHigh={candle.high}
        candleLow={candle.low}
        candleClose={candle.close}
        currentPrice={candle.currentPrice}
        wickDirection={candle.wickDirection}
        wickExtreme={candle.wickExtreme}
        entryPrice={candle.entryPrice}
        stopLoss={candle.stopLoss}
        targetPrice={candle.targetPrice}
        dailyBias={candle.dailyBias}
      />

      {/* Stage panels */}
      <StagePanel title="Stage 1 — Context & Candle" emoji="🌍" stage={context} accent="blue" />
      <StagePanel title="Stage 2 — 4H Wick (Manipulation)" emoji="⚡" stage={wick} accent="orange" />
      <StagePanel title="Stage 3 — 15M Structure Shift" emoji="🔍" stage={structure} accent="purple" />
      <StagePanel title="Stage 4 — 1M Entry Trigger" emoji="🎯" stage={entry} accent="emerald" />

      {/* Trade card */}
      {trade && preEntryReady && !trade.invalid && (
        <div className="p-4 rounded-lg bg-teal-950/30 border-2 border-teal-700 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-bold text-teal-200">💰 Trade Setup</p>
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
              <p className="text-xs text-gray-500">Target (Body)</p>
              <p className="font-bold tabular-nums text-green-400">{formatPrice(trade.tp)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">RR</p>
              <p className={`font-bold tabular-nums ${trade.rr >= 3 ? "text-green-300" : trade.rr >= 2 ? "text-yellow-300" : "text-red-300"}`}>
                1:{trade.rr?.toFixed(2) ?? "—"}
              </p>
            </div>
            {trade.riskAmount !== undefined && (
              <div>
                <p className="text-xs text-gray-500">Risk</p>
                <p className="font-bold tabular-nums text-white">${trade.riskAmount}</p>
              </div>
            )}
          </div>

          {trade.rr !== undefined && trade.rr < 2 && (
            <p className="text-xs text-red-300 pt-2 border-t border-teal-800/50">
              ⚠️ FWT requires RR ≥ 2:1. This is a quick-profit system — if the RR isn't there, the target is too close or the SL too wide.
            </p>
          )}
        </div>
      )}

      {/* Invalid trade */}
      {trade?.invalid && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-700 text-red-200 text-xs">
          <strong>Invalid Trade:</strong> {trade.invalidReason}
        </div>
      )}

      {/* Reasons panel */}
      {!preEntryReady && reasons && reasons.length > 0 && (
        <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-800 space-y-2">
          <p className="text-xs font-bold text-yellow-200">⏳ Sequence Incomplete</p>
          <ul className="text-xs text-yellow-200 space-y-1 ml-4 list-disc">
            {reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}