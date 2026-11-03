// components/ApxCard.jsx
"use client";

import { formatPrice } from "@/lib/formatNumbers";
import { APX_SETUP_TYPES, APX_DIRECTIONS } from "@/lib/apxEngine";

function StagePanel({ title, emoji, stage, accent = "amber", children }) {
  const accentMap = {
    teal:    "border-teal-800/60 bg-teal-950/20",
    blue:    "border-blue-800/60 bg-blue-950/20",
    purple:  "border-purple-800/60 bg-purple-950/20",
    emerald: "border-emerald-800/60 bg-emerald-950/20",
    orange:  "border-orange-800/60 bg-orange-950/20",
    red:     "border-red-800/60 bg-red-950/20",
    amber:   "border-amber-800/60 bg-amber-950/20",
  };
  const cls = accentMap[accent] || accentMap.amber;

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

function CandleVisual({
  direction,
  rangeHigh, rangeLow,
  impulseHigh, impulseLow,
  ce, oteLow, oteHigh,
  sweepLevel, mssLevel, inducementLevel,
  fvgHigh, fvgLow,
  entryPrice, stopLoss, targetPrice,
}) {
  const values = [
    rangeHigh, rangeLow,
    impulseHigh, impulseLow,
    ce, oteLow, oteHigh,
    sweepLevel, mssLevel, inducementLevel,
    fvgHigh, fvgLow,
    entryPrice, stopLoss, targetPrice,
  ].filter((v) => typeof v === "number" && Number.isFinite(v));

  if (values.length < 2) {
    return (
      <div className="p-3 rounded-lg bg-black/40 border border-gray-800 text-center">
        <p className="text-xs text-gray-500">Enter range + impulse to see the visual.</p>
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = range * 0.15;
  const topPrice = max + pad;
  const bottomPrice = min - pad;
  const total = topPrice - bottomPrice;

  const height = 260;
  const chartTop = 20;
  const chartBottom = height - 20;

  const priceToY = (p) => {
    if (typeof p !== "number" || !Number.isFinite(p)) return null;
    const ratio = (p - bottomPrice) / total;
    return chartTop + (chartBottom - chartTop) * (1 - ratio);
  };

  const isShort = direction === "short";

  const Line = ({ value, label, color, dashed = false, badgeClass }) => {
    const y = priceToY(value);
    if (y === null) return null;
    return (
      <div className="absolute left-0 right-0 flex items-center" style={{ top: `${y}px` }}>
        <div className={`flex-1 ${color} ${dashed ? "border-t border-dashed" : "border-t"}`} />
        <span className={`text-[10px] font-bold px-1 rounded ${badgeClass}`}>
          {label} {formatPrice(value)}
        </span>
        <div className={`flex-1 ${color} ${dashed ? "border-t border-dashed" : "border-t"}`} />
      </div>
    );
  };

  return (
    <div className="p-3 rounded-lg bg-black/60 border border-amber-800/60 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-amber-300">📐 APX Zones</p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
          isShort
            ? "bg-red-900/40 border border-red-700 text-red-200"
            : "bg-green-900/40 border border-green-700 text-green-200"
        }`}>
          {isShort ? "SHORT" : "LONG"}
        </span>
      </div>

      <div className="relative" style={{ height: `${height}px` }}>
        <div className="absolute inset-0 bg-black/30 rounded border border-gray-800" />

        {/* Premium / Discount background bands */}
        {ce !== null && rangeHigh !== null && (
          <div
            className="absolute left-0 right-0 bg-red-950/20"
            style={{
              top: `${priceToY(rangeHigh)}px`,
              height: `${Math.max(1, priceToY(ce) - priceToY(rangeHigh))}px`,
            }}
          />
        )}
        {ce !== null && rangeLow !== null && (
          <div
            className="absolute left-0 right-0 bg-green-950/20"
            style={{
              top: `${priceToY(ce)}px`,
              height: `${Math.max(1, priceToY(rangeLow) - priceToY(ce))}px`,
            }}
          />
        )}

        {/* OTE band */}
        {oteLow !== null && oteHigh !== null && (
          <div
            className="absolute left-0 right-0 bg-amber-500/15"
            style={{
              top: `${priceToY(Math.max(oteLow, oteHigh))}px`,
              height: `${Math.max(2, Math.abs(priceToY(oteLow) - priceToY(oteHigh)))}px`,
            }}
          />
        )}

        {/* FVG band */}
        {fvgHigh !== null && fvgLow !== null && (
          <div
            className="absolute left-0 right-0 bg-blue-500/15"
            style={{
              top: `${priceToY(fvgHigh)}px`,
              height: `${Math.max(2, Math.abs(priceToY(fvgHigh) - priceToY(fvgLow)))}px`,
            }}
          />
        )}

        <Line value={rangeHigh} label="RANGE H" color="border-white/40" dashed badgeClass="bg-black/80 text-white" />
        <Line value={rangeLow}  label="RANGE L" color="border-white/40" dashed badgeClass="bg-black/80 text-white" />
        <Line value={ce}        label="CE"      color="border-amber-400" dashed badgeClass="bg-amber-900/80 text-amber-200" />
        <Line value={sweepLevel}     label="SWEEP" color="border-violet-500" badgeClass="bg-violet-900/80 text-violet-200" />
        <Line value={mssLevel}       label="MSS"   color="border-blue-500"   badgeClass="bg-blue-900/80 text-blue-200" />
        <Line value={inducementLevel} label="IDM"  color="border-pink-500"   badgeClass="bg-pink-900/80 text-pink-200" />

        <Line value={entryPrice}  label="ENTRY" color="border-yellow-400" badgeClass="bg-yellow-900/80 text-yellow-200" />
        <Line value={stopLoss}    label="SL"    color="border-red-500"    badgeClass="bg-red-900/80 text-red-200" />
        <Line value={targetPrice} label="TP"    color="border-green-500"  badgeClass="bg-green-900/80 text-green-200" />
      </div>

      <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-400">
        <p>Range H: <span className="text-white font-mono">{formatPrice(rangeHigh)}</span></p>
        <p>Range L: <span className="text-white font-mono">{formatPrice(rangeLow)}</span></p>
        <p>Impulse H: <span className="text-white font-mono">{formatPrice(impulseHigh)}</span></p>
        <p>Impulse L: <span className="text-white font-mono">{formatPrice(impulseLow)}</span></p>
      </div>
    </div>
  );
}

export default function ApxCard({ data }) {
  if (!data) return null;

  const { setupType, bias, direction, pair, timeframeStack, context, liquidity, structure, entry, trade, preEntryReady, reasons, candle = {} } = data;

  const verdict = preEntryReady && trade ? trade.direction : "WAIT";
  const verdictColor =
    verdict === "BUY" ? "bg-green-900/40 border-green-600 text-green-200"
    : verdict === "SELL" ? "bg-red-900/40 border-red-600 text-red-200"
    : "bg-yellow-950/40 border-yellow-700 text-yellow-200";
  const verdictEmoji = verdict === "BUY" ? "🟢" : verdict === "SELL" ? "🔴" : "⏳";

  const setupMeta = APX_SETUP_TYPES.find((s) => s.key === setupType);
  const dirMeta = APX_DIRECTIONS.find((d) => d.key === direction);

  return (
    <div className="p-4 rounded-lg bg-gray-900 border-2 border-amber-800 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-amber-300">
            🎯 APX — {setupMeta ? setupMeta.label : "Institutional Flow"}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {pair || "—"} · {timeframeStack || "—"}
            {dirMeta && <span className="ml-1 text-amber-400">· {dirMeta.emoji} {dirMeta.label}</span>}
            {bias && <span className="ml-1 text-gray-400">· {bias}</span>}
          </p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full border-2 font-bold ${verdictColor}`}>
          {verdictEmoji} {verdict}
        </span>
      </div>

      <CandleVisual
        direction={direction}
        rangeHigh={candle.rangeHigh}
        rangeLow={candle.rangeLow}
        impulseHigh={candle.impulseHigh}
        impulseLow={candle.impulseLow}
        ce={candle.ce}
        oteLow={candle.oteLow}
        oteHigh={candle.oteHigh}
        sweepLevel={candle.sweepLevel}
        mssLevel={candle.mssLevel}
        inducementLevel={candle.inducementLevel}
        fvgHigh={candle.fvgHigh}
        fvgLow={candle.fvgLow}
        entryPrice={candle.entryPrice}
        stopLoss={candle.stopLoss}
        targetPrice={candle.targetPrice}
      />

      <StagePanel title="Stage 1 — Context" emoji="🌍" stage={context} accent="blue" />
      <StagePanel title="Stage 2 — Liquidity" emoji="💧" stage={liquidity} accent="orange" />
      <StagePanel title="Stage 3 — Inducement / MSS" emoji="🔍" stage={structure} accent="purple" />
      <StagePanel title="Stage 4 — Entry" emoji="🎯" stage={entry} accent="amber" />

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
            <div><p className="text-xs text-gray-500">Entry</p><p className="font-bold tabular-nums text-yellow-400">{formatPrice(trade.entry)}</p></div>
            <div><p className="text-xs text-gray-500">Stop Loss</p><p className="font-bold tabular-nums text-red-400">{formatPrice(trade.sl)}</p></div>
            <div><p className="text-xs text-gray-500">Target</p><p className="font-bold tabular-nums text-green-400">{formatPrice(trade.tp)}</p></div>
            <div><p className="text-xs text-gray-500">RR</p><p className={`font-bold tabular-nums ${trade.rr >= 3 ? "text-green-300" : trade.rr >= 2 ? "text-yellow-300" : "text-red-300"}`}>1:{trade.rr?.toFixed(2) ?? "—"}</p></div>
          </div>
          {trade.rr !== undefined && trade.rr < 2 && (
            <p className="text-xs text-red-300 pt-2 border-t border-amber-800/50">
              ⚠️ APX requires RR ≥ 2:1. Target too close or SL too wide.
            </p>
          )}
        </div>
      )}

      {trade?.invalid && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-700 text-red-200 text-xs">
          <strong>Invalid Trade:</strong> {trade.invalidReason}
        </div>
      )}

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