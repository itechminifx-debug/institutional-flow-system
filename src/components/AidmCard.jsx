"use client";

import { formatPrice } from "@/lib/formatNumbers";

// ============================================================
// Reusable StagePanel (same visual as FwtCard)
// ============================================================
function StagePanel({ title, emoji, stage, accent = "teal" }) {
  const accentMap = {
    teal:    "border-teal-800/60 bg-teal-950/20",
    blue:    "border-blue-800/60 bg-blue-950/20",
    purple:  "border-purple-800/60 bg-purple-950/20",
    emerald: "border-emerald-800/60 bg-emerald-950/20",
    orange:  "border-orange-800/60 bg-orange-950/20",
    red:     "border-red-800/60 bg-red-950/20",
    sky:     "border-sky-800/60 bg-sky-950/20",
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
      </div>
    </div>
  );
}

// ============================================================
// Price Ladder Visual
// Range High / 79% / 62% / CE / Range Low + markers
// ============================================================
function PriceLadder({
  direction,
  rangeHigh,
  rangeLow,
  ce,
  ote62,
  ote79,
  poiZone,
  currentPrice,
  entryPrice,
  stopLoss,
  targetPrice,
}) {
  const H = parseFloat(rangeHigh);
  const L = parseFloat(rangeLow);
  const CE = parseFloat(ce);
  const O62 = parseFloat(ote62);
  const O79 = parseFloat(ote79);
  const cur = parseFloat(currentPrice);
  const entry = parseFloat(entryPrice);
  const sl = parseFloat(stopLoss);
  const tp = parseFloat(targetPrice);

  if (isNaN(H) || isNaN(L) || H <= L) {
    return (
      <div className="p-3 rounded-lg bg-black/40 border border-gray-800 text-center">
        <p className="text-xs text-gray-500">Enter a valid Range High / Low to see the ladder.</p>
      </div>
    );
  }

  const pad = (H - L) * 0.18;
  const top = H + pad;
  const bottom = L - pad;
  const span = top - bottom;
  const height = 320;
  const chartTop = 20;
  const chartBottom = height - 20;

  const y = (p) => {
    if (isNaN(p)) return null;
    const ratio = (p - bottom) / span;
    return chartTop + (chartBottom - chartTop) * (1 - ratio);
  };

  const isBull = direction === "bullish";

  const yH   = y(H);
  const yL   = y(L);
  const yCE  = y(CE);
  const y62  = y(O62);
  const y79  = y(O79);
  const yCur = y(cur);
  const yEnt = y(entry);
  const ySL  = y(sl);
  const yTP  = y(tp);

  // Zone shading — bullish POI in Discount (below CE), bearish POI in Premium (above CE)
  const premiumTop = yH;
  const premiumBottom = yCE;
  const discountTop = yCE;
  const discountBottom = yL;

  // OTE band top/bottom
  const oteTop = Math.min(y62, y79);
  const oteBottom = Math.max(y62, y79);

  return (
    <div className="p-3 rounded-lg bg-black/60 border border-sky-800/60 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-sky-300">📐 Dealing Range Ladder</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
            isBull
              ? "bg-green-900/40 border border-green-700 text-green-200"
              : "bg-red-900/40 border border-red-700 text-red-200"
          }`}>
            {isBull ? "🟢 BULLISH" : "🔴 BEARISH"}
          </span>
          {poiZone && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-900/40 border border-sky-700 text-sky-200 uppercase">
              POI: {poiZone}
            </span>
          )}
        </div>
      </div>

      <div className="relative" style={{ height: `${height}px` }}>
        <div className="absolute inset-0 bg-black/30 rounded border border-gray-800" />

        {/* Premium zone (above CE) */}
        <div
          className="absolute left-0 right-0 bg-red-950/20"
          style={{ top: `${premiumTop}px`, height: `${premiumBottom - premiumTop}px` }}
        />
        <div className="absolute left-2 text-[9px] text-red-300/80 font-bold" style={{ top: `${premiumTop + 4}px` }}>
          PREMIUM
        </div>

        {/* Discount zone (below CE) */}
        <div
          className="absolute left-0 right-0 bg-green-950/20"
          style={{ top: `${discountTop}px`, height: `${discountBottom - discountTop}px` }}
        />
        <div className="absolute left-2 text-[9px] text-green-300/80 font-bold" style={{ top: `${discountBottom - 14}px` }}>
          DISCOUNT
        </div>

        {/* OTE band */}
        <div
          className="absolute left-0 right-0 border-y-2 border-dashed border-sky-500/70 bg-sky-900/20"
          style={{ top: `${oteTop}px`, height: `${oteBottom - oteTop}px` }}
        >
          <span className="absolute right-2 top-1 text-[9px] text-sky-200 font-bold bg-sky-950/80 px-1 rounded">
            OTE 62–79%
          </span>
        </div>

        {/* Range High */}
        <div className="absolute left-0 right-0 flex items-center" style={{ top: `${yH}px` }}>
          <div className="flex-1 border-t border-gray-500" />
          <span className="text-[10px] text-gray-200 font-bold px-1 bg-gray-900/90 rounded">
            HIGH {formatPrice(H)}
          </span>
          <div className="flex-1 border-t border-gray-500" />
        </div>

        {/* 79% */}
        {y79 !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${y79}px` }}>
            <div className="flex-1 border-t border-dashed border-sky-500" />
            <span className="text-[10px] text-sky-300 font-bold px-1 bg-black/80 rounded">79% {formatPrice(O79)}</span>
            <div className="flex-1 border-t border-dashed border-sky-500" />
          </div>
        )}

        {/* 62% */}
        {y62 !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${y62}px` }}>
            <div className="flex-1 border-t border-dashed border-sky-500" />
            <span className="text-[10px] text-sky-300 font-bold px-1 bg-black/80 rounded">62% {formatPrice(O62)}</span>
            <div className="flex-1 border-t border-dashed border-sky-500" />
          </div>
        )}

        {/* CE 50% */}
        {yCE !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${yCE}px` }}>
            <div className="flex-1 border-t-2 border-yellow-400" />
            <span className="text-[10px] text-yellow-200 font-bold px-1 bg-yellow-900/80 rounded">
              50% CE {formatPrice(CE)}
            </span>
            <div className="flex-1 border-t-2 border-yellow-400" />
          </div>
        )}

        {/* Range Low */}
        <div className="absolute left-0 right-0 flex items-center" style={{ top: `${yL}px` }}>
          <div className="flex-1 border-t border-gray-500" />
          <span className="text-[10px] text-gray-200 font-bold px-1 bg-gray-900/90 rounded">
            LOW {formatPrice(L)}
          </span>
          <div className="flex-1 border-t border-gray-500" />
        </div>

        {/* Current Price */}
        {yCur !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${yCur}px` }}>
            <div className="flex-1 border-t border-cyan-400" />
            <span className="text-[10px] text-cyan-200 font-bold px-1 bg-cyan-900/80 rounded">
              PRICE {formatPrice(cur)}
            </span>
            <div className="flex-1 border-t border-cyan-400" />
          </div>
        )}

        {/* Entry */}
        {yEnt !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${yEnt}px` }}>
            <div className="flex-1 border-t border-yellow-400" />
            <span className="text-[10px] text-yellow-200 font-bold px-1 bg-yellow-900/80 rounded">
              ENTRY {formatPrice(entry)}
            </span>
            <div className="flex-1 border-t border-yellow-400" />
          </div>
        )}

        {/* SL */}
        {ySL !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${ySL}px` }}>
            <div className="flex-1 border-t border-red-500" />
            <span className="text-[10px] text-red-200 font-bold px-1 bg-red-900/80 rounded">
              SL {formatPrice(sl)}
            </span>
            <div className="flex-1 border-t border-red-500" />
          </div>
        )}

        {/* TP */}
        {yTP !== null && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${yTP}px` }}>
            <div className="flex-1 border-t border-green-500" />
            <span className="text-[10px] text-green-200 font-bold px-1 bg-green-900/80 rounded">
              TP {formatPrice(tp)}
            </span>
            <div className="flex-1 border-t border-green-500" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-400">
        <p>High: <span className="text-white font-mono">{formatPrice(H)}</span></p>
        <p>Low: <span className="text-white font-mono">{formatPrice(L)}</span></p>
        <p>Size: <span className="text-white font-mono">{formatPrice(H - L)}</span></p>
        <p>CE: <span className="text-yellow-300 font-mono">{isNaN(CE) ? "—" : formatPrice(CE)}</span></p>
      </div>
    </div>
  );
}

// ============================================================
// Main AIDM Card
// ============================================================
export default function AidmCard({ data }) {
  if (!data) return null;

  const {
    direction,
    rangeHigh,
    rangeLow,
    ce,
    ote62,
    ote79,
    poiZone,
    currentPrice,
    entryPrice,
    stopLoss,
    targetPrice,
    context,
    wick,
    structure,
    entry,
    trade,
    preEntryReady,
    reasons,
    structureFlipped,
  } = data;

  const verdict = preEntryReady && trade && !trade.invalid ? (direction === "bullish" ? "BUY" : "SELL") : "WAIT";
  const verdictColor =
    verdict === "BUY"  ? "bg-green-900/40 border-green-600 text-green-200"
    : verdict === "SELL" ? "bg-red-900/40 border-red-600 text-red-200"
    : "bg-yellow-950/40 border-yellow-700 text-yellow-200";
  const verdictEmoji = verdict === "BUY" ? "🟢" : verdict === "SELL" ? "🔴" : "⏳";

  return (
    <div className="p-4 rounded-lg bg-gray-900 border-2 border-sky-800 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-sky-300">📐 AIDM — APEX-IDM Setup</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Map → Time &amp; Trap → Structure Shift → Sniper Entry → Risk &amp; Targets
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {structureFlipped && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold bg-red-900/40 border-red-700 text-red-200">
              🚫 HTF VETO
            </span>
          )}
          <span className={`text-xs px-3 py-1 rounded-full border-2 font-bold ${verdictColor}`}>
            {verdictEmoji} {verdict}
          </span>
        </div>
      </div>

      <PriceLadder
        direction={direction}
        rangeHigh={rangeHigh}
        rangeLow={rangeLow}
        ce={ce}
        ote62={ote62}
        ote79={ote79}
        poiZone={poiZone}
        currentPrice={currentPrice}
        entryPrice={entryPrice}
        stopLoss={stopLoss}
        targetPrice={targetPrice}
      />

      {structureFlipped && (
        <div className="p-3 rounded-lg bg-red-950/40 border-2 border-red-700 space-y-1">
          <p className="text-xs font-bold text-red-200">🚫 HTF Veto Active</p>
          <p className="text-[11px] text-red-100/90">
            This setup fights the higher-timeframe bias. The APEX rule says treat it as counter-trend or skip.
          </p>
        </div>
      )}

      <StagePanel title="Part 1 — Map (Range + CE + OTE)" emoji="🗺️" stage={context} accent="blue" />
      <StagePanel title="Part 2 — Time & Trap (Session + Sweep)" emoji="⚡" stage={wick} accent="orange" />
      <StagePanel title="Part 3 — Structure Shift (MSS + FVG)" emoji="🔍" stage={structure} accent="purple" />
      <StagePanel title="Part 4 — Sniper Entry (Entry + SL)" emoji="🎯" stage={entry} accent="emerald" />

      {trade && preEntryReady && !trade.invalid && (
        <div className="p-4 rounded-lg bg-sky-950/30 border-2 border-sky-700 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-bold text-sky-200">💰 Trade Setup</p>
            <span className={`text-xs px-2 py-1 rounded-full font-bold ${
              direction === "bullish" ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
            }`}>
              {direction === "bullish" ? "BUY" : "SELL"}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><p className="text-xs text-gray-500">Entry</p><p className="font-bold tabular-nums text-yellow-400">{formatPrice(trade.entry)}</p></div>
            <div><p className="text-xs text-gray-500">Stop Loss</p><p className="font-bold tabular-nums text-red-400">{formatPrice(trade.sl)}</p></div>
            <div><p className="text-xs text-gray-500">TP1 (CE)</p><p className="font-bold tabular-nums text-green-400">{formatPrice(trade.tp1)}</p></div>
            <div><p className="text-xs text-gray-500">TP2 (ERL)</p><p className="font-bold tabular-nums text-green-400">{formatPrice(trade.tp2)}</p></div>
            <div><p className="text-xs text-gray-500">RR (TP1)</p><p className={`font-bold tabular-nums ${trade.rrTp1 >= 2 ? "text-green-300" : "text-yellow-300"}`}>1:{trade.rrTp1?.toFixed(2) ?? "—"}</p></div>
            <div><p className="text-xs text-gray-500">RR (TP2)</p><p className={`font-bold tabular-nums ${trade.rrTp2 >= 3 ? "text-green-300" : trade.rrTp2 >= 2 ? "text-yellow-300" : "text-red-300"}`}>1:{trade.rrTp2?.toFixed(2) ?? "—"}</p></div>
            {trade.riskPips !== undefined && (
              <div><p className="text-xs text-gray-500">Risk (pips)</p><p className="font-bold tabular-nums text-white">{trade.riskPips?.toFixed(1)}</p></div>
            )}
            {trade.lotSize !== undefined && trade.lotSize !== null && (
              <div><p className="text-xs text-gray-500">Lots</p><p className="font-bold tabular-nums text-white">{trade.lotSize}</p></div>
            )}
          </div>

          {trade.rrTp1 !== undefined && trade.rrTp1 < 1 && (
            <p className="text-xs text-red-300 pt-2 border-t border-sky-800/50">
              ⚠️ TP1 (50% CE) gives RR below 1:1 — either the entry is too far from CE, or the SL is too wide.
            </p>
          )}
        </div>
      )}

      {trade?.invalid && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-700 text-red-200 text-xs">
          <strong>Invalid Trade:</strong> {trade.invalidReason || (trade.errors && trade.errors[0])}
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