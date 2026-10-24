"use client";

import { formatPrice } from "@/lib/formatNumbers";
import { AMS_SCENARIOS, COMMANDMENTS } from "@/lib/amsEngine";

// ============================================================
// Sub-components
// ============================================================

function PhasePanel({ title, emoji, phase, accent = "blue", children }) {
  const accentMap = {
    blue:    "border-blue-800/60 bg-blue-950/20",
    red:     "border-red-800/60 bg-red-950/20",
    purple:  "border-purple-800/60 bg-purple-950/20",
    emerald: "border-emerald-800/60 bg-emerald-950/20",
    amber:   "border-amber-800/60 bg-amber-950/20",
    orange:  "border-orange-800/60 bg-orange-950/20",
  };
  const cls = accentMap[accent] || accentMap.blue;

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
// Commandments Grid — 10 icons showing pass/fail per rule
// ============================================================
function CommandmentsGrid({ commandments }) {
  if (!commandments) return null;

  const { results, passed, hardBlocked, warnings } = commandments;

  return (
    <div className="p-3 rounded-lg border border-red-800/60 bg-red-950/20 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-gray-200">📜 The 10 Commandments</p>
        <span className={`text-[10px] font-bold ${passed === 10 ? "text-green-300" : passed >= 7 ? "text-yellow-300" : "text-red-300"}`}>
          {passed}/10 {hardBlocked && "❌ BLOCKED"}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1">
        {results.map((r) => {
          const rule = COMMANDMENTS.find(c => c.n === r.n);
          return (
            <div
              key={r.n}
              className={`flex flex-col items-center justify-center p-1.5 rounded border text-center ${
                r.pass
                  ? "bg-green-950/30 border-green-800 text-green-200"
                  : r.hardBlock
                  ? "bg-red-950/40 border-red-700 text-red-200"
                  : "bg-yellow-950/30 border-yellow-800 text-yellow-200"
              }`}
              title={rule?.text || `Commandment ${r.n}`}
            >
              <span className="text-base leading-none">
                {r.pass ? "✅" : r.hardBlock ? "🚫" : "⚠️"}
              </span>
              <span className="text-[9px] font-bold mt-0.5">#{r.n}</span>
              {r.hardBlock && !r.pass && <span className="text-[8px] mt-0.5">BLOCK</span>}
            </div>
          );
        })}
      </div>

      {warnings.length > 0 && (
        <div className="pt-2 border-t border-red-800/40 space-y-1">
          {results.filter(r => !r.pass).map(r => (
            <p key={r.n} className="text-[10px] text-red-200">
              #{r.n} — {r.detail}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Anatomy Map — shows swings + structural breaks
// ============================================================
function AnatomyMap({
  lastHH,
  lastHL,
  lastLH,
  lastLL,
  eqhEqlLevel,
  bosLevel,
  chochLevel,
  mssLevel,
  d1Bias,
  d1RangeHigh,
  d1RangeLow,
  currentPrice,
  dolLevel,
  activeEntry,
  activeSl,
  activeTp1,
  activeTp2,
}) {
  const hh = parseFloat(lastHH);
  const hl = parseFloat(lastHL);
  const lh = parseFloat(lastLH);
  const ll = parseFloat(lastLL);
  const eq = parseFloat(eqhEqlLevel);
  const bos = parseFloat(bosLevel);
  const choch = parseFloat(chochLevel);
  const mss = parseFloat(mssLevel);
  const rHigh = parseFloat(d1RangeHigh);
  const rLow = parseFloat(d1RangeLow);
  const cur = parseFloat(currentPrice);
  const dol = parseFloat(dolLevel);
  const entry = parseFloat(activeEntry);
  const sl = parseFloat(activeSl);
  const tp1 = parseFloat(activeTp1);
  const tp2 = parseFloat(activeTp2);

  // Collect all valid prices to compute chart range
  const allPrices = [hh, hl, lh, ll, eq, bos, choch, mss, rHigh, rLow, cur, dol, entry, sl, tp1, tp2].filter(p => !isNaN(p));
  if (allPrices.length < 2) {
    return (
      <div className="p-3 rounded-lg bg-black/40 border border-gray-800 text-center">
        <p className="text-xs text-gray-500">Enter swing points to see the anatomy map.</p>
      </div>
    );
  }

  const topPrice = Math.max(...allPrices);
  const bottomPrice = Math.min(...allPrices);
  const priceRange = topPrice - bottomPrice;
  const padding = priceRange * 0.08;
  const displayTop = topPrice + padding;
  const displayBottom = bottomPrice - padding;
  const totalRange = displayTop - displayBottom;
  const height = 340;
  const chartTop = 20;
  const chartBottom = height - 20;

  const priceToY = (p) => {
    if (isNaN(p)) return null;
    const ratio = (p - displayBottom) / totalRange;
    return chartTop + (chartBottom - chartTop) * (1 - ratio);
  };

  const isShort = d1Bias === "bearish";

  // Lines to render
  const lines = [
    { price: hh, label: "HH", color: "border-green-500", textColor: "text-green-200 bg-green-900/80" },
    { price: hl, label: "HL", color: "border-green-500", textColor: "text-green-200 bg-green-900/80" },
    { price: lh, label: "LH", color: "border-red-500", textColor: "text-red-200 bg-red-900/80" },
    { price: ll, label: "LL", color: "border-red-500", textColor: "text-red-200 bg-red-900/80" },
    { price: eq, label: "EQH/EQL", color: "border-pink-400", textColor: "text-pink-200 bg-pink-900/80" },
    { price: bos, label: "BOS (trap)", color: "border-dashed border-gray-400", textColor: "text-gray-200 bg-gray-900/80" },
    { price: choch, label: "CHoCH", color: "border-yellow-400", textColor: "text-yellow-200 bg-yellow-900/80" },
    { price: mss, label: "MSS", color: "border-2 border-purple-400", textColor: "text-purple-200 bg-purple-900/80" },
    { price: rHigh, label: "D1 HIGH", color: "border-gray-500", textColor: "text-gray-300 bg-gray-900/80" },
    { price: rLow, label: "D1 LOW", color: "border-gray-500", textColor: "text-gray-300 bg-gray-900/80" },
    { price: dol, label: "🎯 DOL", color: "border-dashed border-amber-400", textColor: "text-amber-200 bg-amber-900/80" },
    { price: cur, label: "PRICE", color: "border-cyan-400", textColor: "text-cyan-200 bg-cyan-900/80" },
    { price: entry, label: "ENTRY", color: "border-yellow-400", textColor: "text-yellow-200 bg-yellow-900/80" },
    { price: sl, label: "SL", color: "border-red-500", textColor: "text-red-200 bg-red-900/80" },
    { price: tp1, label: "TP1", color: "border-dashed border-green-400", textColor: "text-green-200 bg-green-900/80" },
    { price: tp2, label: "TP2", color: "border-2 border-green-500", textColor: "text-green-200 bg-green-900/80" },
  ].filter(l => !isNaN(l.price));

  return (
    <div className="p-3 rounded-lg bg-black/60 border border-red-800/60 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-red-300">🦴 Anatomy Map</p>
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

        {lines.map((l, i) => {
          const y = priceToY(l.price);
          if (y === null) return null;
          return (
            <div key={i} className="absolute left-0 right-0 flex items-center" style={{ top: `${y}px` }}>
              <div className={`flex-1 border-t ${l.color}`} />
              <span className={`text-[9px] font-bold px-1 rounded whitespace-nowrap ${l.textColor}`}>
                {l.label} {formatPrice(l.price)}
              </span>
              <div className={`flex-1 border-t ${l.color}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Entry Comparison — AUTO vs MANUAL
// ============================================================
function EntryComparison({ auto, entryMode, activeEntry, activeSl, activeTp1, activeTp2 }) {
  const hasAuto = auto?.autoEntry !== null && auto?.autoEntry !== undefined;
  const isManual = entryMode === "manual";

  return (
    <div className={`p-3 rounded-lg border space-y-2 ${
      isManual
        ? "bg-purple-950/20 border-purple-700"
        : "bg-blue-950/20 border-blue-700"
    }`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-gray-200">
          {isManual ? "✍️ Manual Entry" : "🤖 Auto Entry"}
        </p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
          isManual
            ? "bg-purple-900/60 border border-purple-600 text-purple-100"
            : "bg-blue-900/60 border border-blue-600 text-blue-100"
        }`}>
          {isManual ? "MANUAL" : "AUTO"}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div>
          <p className="text-gray-500 text-[10px]">Entry</p>
          <p className="font-bold tabular-nums text-yellow-400">{activeEntry ? formatPrice(activeEntry) : "—"}</p>
        </div>
        <div>
          <p className="text-gray-500 text-[10px]">SL</p>
          <p className="font-bold tabular-nums text-red-400">{activeSl ? formatPrice(activeSl) : "—"}</p>
        </div>
        <div>
          <p className="text-gray-500 text-[10px]">TP1</p>
          <p className="font-bold tabular-nums text-green-300">{activeTp1 ? formatPrice(activeTp1) : "—"}</p>
        </div>
        <div>
          <p className="text-gray-500 text-[10px]">TP2 (DOL)</p>
          <p className="font-bold tabular-nums text-green-400">{activeTp2 ? formatPrice(activeTp2) : "—"}</p>
        </div>
      </div>

      {/* If in manual mode, show what AUTO would have produced */}
      {isManual && hasAuto && (
        <div className="pt-2 border-t border-purple-700/40 space-y-1">
          <p className="text-[10px] font-bold text-purple-200">🤖 What AUTO would have given you:</p>
          <div className="grid grid-cols-4 gap-2 text-[10px]">
            <div>
              <span className="text-gray-500">Entry: </span>
              <span className="text-yellow-300 font-mono">{auto.autoEntry ? formatPrice(auto.autoEntry) : "—"}</span>
            </div>
            <div>
              <span className="text-gray-500">SL: </span>
              <span className="text-red-300 font-mono">{auto.autoSl ? formatPrice(auto.autoSl) : "—"}</span>
            </div>
            <div>
              <span className="text-gray-500">TP1: </span>
              <span className="text-green-300 font-mono">{auto.autoTp1 ? formatPrice(auto.autoTp1) : "—"}</span>
            </div>
            <div>
              <span className="text-gray-500">TP2: </span>
              <span className="text-green-300 font-mono">{auto.autoTp2 ? formatPrice(auto.autoTp2) : "—"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN CARD
// ============================================================
export default function AmsCard({ data }) {
  if (!data) return null;

  const {
    scenario, scenarioValid,
    d1, anatomy, scenarioPhase, m1, auto, manual, commandments, trade,
    entryMode, activeEntry, activeSl, activeTp1, activeTp2,
    preEntryReady, reasons, isAplus,
  } = data;

  const verdict = preEntryReady && trade ? trade.direction : "WAIT";
  const verdictColor =
    verdict === "BUY" ? "bg-green-900/40 border-green-600 text-green-200"
    : verdict === "SELL" ? "bg-red-900/40 border-red-600 text-red-200"
    : "bg-yellow-950/40 border-yellow-700 text-yellow-200";
  const verdictEmoji = verdict === "BUY" ? "🟢" : verdict === "SELL" ? "🔴" : "⏳";

  const scenarioInfo = AMS_SCENARIOS.find(s => s.key === scenario);

  return (
    <div className="p-4 rounded-lg bg-gray-900 border-2 border-red-800 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-red-300">👑 Apex Master System</h2>
          <p className="text-xs text-gray-500 mt-0.5">Trend / Reversal / Range · Hybrid Entry · 10 Commandments</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {isAplus && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border-2 border-amber-500 bg-amber-900/60 text-amber-100 font-bold">
              🌟 A+
            </span>
          )}
          <span className={`text-xs px-3 py-1 rounded-full border-2 font-bold ${verdictColor}`}>
            {verdictEmoji} {verdict}
          </span>
        </div>
      </div>

      {/* Scenario badge */}
      {scenarioInfo && (
        <div className={`p-2 rounded-lg border ${
          scenario === "trend" ? "border-blue-700 bg-blue-950/20"
          : scenario === "reversal" ? "border-orange-700 bg-orange-950/20"
          : "border-purple-700 bg-purple-950/20"
        }`}>
          <p className={`text-xs font-bold ${
            scenario === "trend" ? "text-blue-300"
            : scenario === "reversal" ? "text-orange-300"
            : "text-purple-300"
          }`}>
            {scenarioInfo.emoji} {scenarioInfo.label}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">{scenarioInfo.hint}</p>
        </div>
      )}
      {!scenarioValid && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-700 text-red-200 text-xs">
          🚫 No scenario selected. Pick Trend / Reversal / Range to begin.
        </div>
      )}

      {/* Commandments Grid */}
      <CommandmentsGrid commandments={commandments} />

      {/* Anatomy Map */}
      <AnatomyMap
        lastHH={data.lastHH}
        lastHL={data.lastHL}
        lastLH={data.lastLH}
        lastLL={data.lastLL}
        eqhEqlLevel={data.eqhEqlLevel}
        bosLevel={data.bosLevel}
        chochLevel={data.chochLevel}
        mssLevel={data.mssLevel}
        d1Bias={data.d1Bias}
        d1RangeHigh={data.d1RangeHigh}
        d1RangeLow={data.d1RangeLow}
        currentPrice={data.currentPrice}
        dolLevel={data.dolLevel}
        activeEntry={activeEntry}
        activeSl={activeSl}
        activeTp1={activeTp1}
        activeTp2={activeTp2}
      />

      {/* Phase Panels */}
      <PhasePanel title="D1 Context" emoji="🌍" phase={d1} accent="blue" />
      <PhasePanel title="Swing Anatomy" emoji="🦴" phase={anatomy} accent="red" />

      {scenario === "trend" && (
        <PhasePanel title="Scenario A — Healthy Trend" emoji="📈" phase={scenarioPhase} accent="blue" />
      )}
      {(scenario === "reversal" || scenario === "range") && (
        <PhasePanel title={`Scenario ${scenario === "reversal" ? "B" : "C"} — ${scenario === "reversal" ? "Reversal" : "Range"}`} emoji={scenario === "reversal" ? "🔄" : "📦"} phase={scenarioPhase} accent="orange" />
      )}

      <PhasePanel title="M1 Trigger" emoji="🎯" phase={m1} accent="emerald" />

      {/* Manual validation (only when in manual mode) */}
      {entryMode === "manual" && manual.gates.length > 0 && (
        <PhasePanel title="Manual Entry Validation" emoji="✍️" phase={manual} accent="purple" />
      )}

      {/* Entry Comparison */}
      <EntryComparison
        auto={auto}
        entryMode={entryMode}
        activeEntry={activeEntry}
        activeSl={activeSl}
        activeTp1={activeTp1}
        activeTp2={activeTp2}
      />

      {/* Trade Card */}
      {trade && preEntryReady && !trade.invalid && (
        <div className="p-4 rounded-lg bg-red-950/30 border-2 border-red-700 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-bold text-red-200">💰 Trade Setup</p>
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
              <p className="text-xs text-gray-500">TP2 (DOL)</p>
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
            <div className="pt-2 border-t border-red-800/60 text-[11px] text-red-200/90 space-y-0.5">
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

      {/* Reasons — incomplete */}
      {!preEntryReady && reasons && reasons.length > 0 && (
        <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-800 space-y-2">
          <p className="text-xs font-bold text-yellow-200">⏳ Setup Incomplete</p>
          <p className="text-[10px] text-yellow-300/80 italic">"The market breathes. We trade the transition from Manipulation to Distribution."</p>
          <ul className="text-xs text-yellow-200 space-y-1 ml-4 list-disc">
            {reasons.slice(0, 8).map((r, i) => <li key={i}>{r}</li>)}
            {reasons.length > 8 && <li className="text-yellow-400">… and {reasons.length - 8} more</li>}
          </ul>
        </div>
      )}
    </div>
  );
}